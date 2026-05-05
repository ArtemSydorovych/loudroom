import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const prismaMock = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  loudroomSession: { findUnique: vi.fn() },
  poll: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), delete: vi.fn() },
  pollOption: {},
};

vi.mock("../prisma.js", () => ({ prisma: prismaMock }));

const PRESENTER_ID = "user-1";

vi.mock("../plugins/auth.js", async () => {
  const fp = (await import("fastify-plugin")).default;
  const requireAuth = (async () => ({
    user: { id: PRESENTER_ID },
    session: { id: "sess-1" },
  })) as never;
  return {
    default: fp(
      async (app) => {
        app.decorateRequest("auth", null);
        app.decorate("requireAuth", requireAuth);
      },
      { name: "auth" },
    ),
  };
});

type App = Awaited<ReturnType<typeof import("../app.js").buildApp>>;

let app: App;
const VALID_SESSION_ID = "123e4567-e89b-12d3-a456-426614174000";

beforeAll(async () => {
  const { buildApp } = await import("../app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("polls routes", () => {
  it("GET /api/sessions/:id/polls returns 404 when session is not owned by caller", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({
      id: VALID_SESSION_ID,
      userId: "other-user",
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/sessions/${VALID_SESSION_ID}/polls`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/sessions/:id/polls validates body shape", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/sessions/${VALID_SESSION_ID}/polls`,
      payload: { question: "Q?", type: "MULTIPLE_CHOICE", options: [{ text: "only-one" }] },
    });
    // Zod throws because options.length < 2 -> 500
    expect(res.statusCode).toBe(500);
  });

  it("POST /api/sessions/:id/polls rejects correctOptionIndex out of range", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({
      id: VALID_SESSION_ID,
      userId: PRESENTER_ID,
    });
    const res = await app.inject({
      method: "POST",
      url: `/api/sessions/${VALID_SESSION_ID}/polls`,
      payload: {
        question: "Q?",
        type: "QUIZ",
        options: [{ text: "A" }, { text: "B" }],
        correctOptionIndex: 5,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "correct_option_out_of_range" });
  });

  it("POST /api/sessions/:id/polls creates a poll with options inside a transaction", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({
      id: VALID_SESSION_ID,
      userId: PRESENTER_ID,
    });
    prismaMock.poll.count.mockResolvedValueOnce(0);

    const txPoll = {
      create: vi.fn().mockResolvedValue({
        id: "poll-1",
        sessionId: VALID_SESSION_ID,
        question: "Q?",
        type: "MULTIPLE_CHOICE",
        orderIndex: 0,
      }),
      update: vi.fn(),
    };
    const txOption = {
      create: vi
        .fn()
        .mockResolvedValueOnce({ id: "opt-1", text: "A", orderIndex: 0, pollId: "poll-1" })
        .mockResolvedValueOnce({ id: "opt-2", text: "B", orderIndex: 1, pollId: "poll-1" }),
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ poll: txPoll, pollOption: txOption }),
    );

    const res = await app.inject({
      method: "POST",
      url: `/api/sessions/${VALID_SESSION_ID}/polls`,
      payload: {
        question: "Q?",
        type: "MULTIPLE_CHOICE",
        options: [{ text: "A" }, { text: "B" }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("poll-1");
    expect(body.options).toHaveLength(2);
    expect(txPoll.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderIndex: 0 }) }),
    );
  });

  it("DELETE /api/polls/:id returns 204 on success", async () => {
    prismaMock.poll.findUnique.mockResolvedValueOnce({
      id: "poll-1",
      session: { userId: PRESENTER_ID },
    });
    prismaMock.poll.delete.mockResolvedValueOnce({});

    const res = await app.inject({
      method: "DELETE",
      url: "/api/polls/123e4567-e89b-12d3-a456-426614174000",
    });
    expect(res.statusCode).toBe(204);
  });
});
