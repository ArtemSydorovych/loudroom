import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const prismaMock = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRaw: vi.fn(),
  loudroomSession: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  participant: {
    create: vi.fn(),
  },
};

vi.mock("../prisma.js", () => ({ prisma: prismaMock }));

const PRESENTER_ID = "user-1";
let authedRequireAuth = true;

vi.mock("../plugins/auth.js", async () => {
  const fp = (await import("fastify-plugin")).default;
  const requireAuth = (async (_req: unknown, reply: { code: (n: number) => { send: (b: unknown) => void } }) => {
    if (!authedRequireAuth) {
      reply.code(401).send({ error: "unauthorized" });
      return undefined;
    }
    return { user: { id: PRESENTER_ID }, session: { id: "sess-1" } };
  }) as never;
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

beforeAll(async () => {
  authedRequireAuth = true;
  const { buildApp } = await import("../app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("sessions routes", () => {
  it("GET /api/sessions returns the presenter's own sessions", async () => {
    prismaMock.loudroomSession.findMany.mockResolvedValueOnce([
      { id: "s1", userId: PRESENTER_ID, title: "Demo", joinCode: "ABCDEF", status: "WAITING" },
    ]);
    const res = await app.inject({ method: "GET", url: "/api/sessions" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(prismaMock.loudroomSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: PRESENTER_ID } }),
    );
  });

  it("POST /api/sessions creates a session with a generated join code", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce(null);
    prismaMock.loudroomSession.create.mockResolvedValueOnce({
      id: "s2",
      userId: PRESENTER_ID,
      title: "Talk",
      joinCode: "XYZ234",
      status: "WAITING",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/sessions",
      payload: { title: "Talk" },
    });

    expect(res.statusCode).toBe(200);
    const created = res.json();
    expect(created.title).toBe("Talk");
    expect(created.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("POST /api/sessions rejects an empty title", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/sessions",
      payload: { title: "" },
    });
    expect(res.statusCode).toBe(500);
  });

  it("GET /api/sessions/:id returns 404 when the session belongs to someone else", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({
      id: "s3",
      userId: "another-user",
      title: "Other",
      joinCode: "JKLMNP",
      status: "WAITING",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/sessions/123e4567-e89b-12d3-a456-426614174000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/sessions/by-code is public and uppercases the code", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({
      id: "s4",
      title: "Public",
      status: "WAITING",
      joinCode: "ABCDEF",
    });
    const res = await app.inject({ method: "GET", url: "/api/sessions/by-code/abcdef" });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.loudroomSession.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { joinCode: "ABCDEF" } }),
    );
  });

  it("POST /api/sessions/:id/participants returns 409 if the session has ended", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({
      id: "s5",
      userId: PRESENTER_ID,
      title: "Done",
      joinCode: "JKLMNP",
      status: "ENDED",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/sessions/123e4567-e89b-12d3-a456-426614174001/participants",
      payload: { nickname: "alice" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "session_ended" });
  });
});
