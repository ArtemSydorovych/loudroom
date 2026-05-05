import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { FastifyBaseLogger } from "fastify";
import { type Socket as ClientSocket, io as ioc } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../../packages/types/src/socket.js";
import { createHub, type Hub } from "./hub.js";

const noopLogger: FastifyBaseLogger = {
  level: "silent",
  fatal: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  silent: vi.fn(),
  child: () => noopLogger,
} as unknown as FastifyBaseLogger;

const SESSION = { id: "sess-1", title: "Demo", status: "ACTIVE", joinCode: "ABCDEF", userId: "u1" };
const POLL = {
  id: "poll-1",
  sessionId: "sess-1",
  question: "Q?",
  options: [
    { id: "opt-1", text: "A", orderIndex: 0, pollId: "poll-1" },
    { id: "opt-2", text: "B", orderIndex: 1, pollId: "poll-1" },
  ],
  timeLimitSeconds: null,
  correctOptionId: null,
};

const prismaMock = {
  loudroomSession: { findUnique: vi.fn() },
  participant: { findUnique: vi.fn() },
  poll: { findUnique: vi.fn() },
  vote: { create: vi.fn(), groupBy: vi.fn() },
  question: { create: vi.fn(), update: vi.fn() },
};

let httpServer: HttpServer;
let hub: Hub;
let url: string;

function connect(): ClientSocket<ServerToClientEvents, ClientToServerEvents> {
  return ioc(url, { transports: ["websocket"], forceNew: true });
}

beforeAll(async () => {
  httpServer = createServer();
  hub = createHub(httpServer, {
    prisma: prismaMock as unknown as Parameters<typeof createHub>[1]["prisma"],
    log: noopLogger,
  });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  url = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await hub.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe("socket hub", () => {
  it("joinSession emits sessionJoined to the joiner and a participantCountUpdate to the room", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce(SESSION);
    prismaMock.participant.findUnique.mockResolvedValueOnce({ id: "p1", sessionId: "sess-1" });

    const client = connect();
    const joined = await new Promise<{ id: string; title: string; status: string }>((resolve, reject) => {
      client.once("sessionJoined", resolve);
      client.once("error", reject);
      client.emit("joinSession", { sessionId: "sess-1", participantId: "p1", nickname: "alice" });
    });
    expect(joined).toMatchObject({ id: "sess-1", title: "Demo" });

    client.disconnect();
  });

  it("rejects joining an ENDED session with error", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce({ ...SESSION, status: "ENDED" });

    const client = connect();
    const errMsg = await new Promise<string>((resolve) => {
      client.once("error", resolve);
      client.emit("joinSession", { sessionId: "sess-1", participantId: "p1", nickname: "x" });
    });
    expect(errMsg).toBe("session_ended");
    client.disconnect();
  });

  it("vote broadcasts updated tallies to the session room", async () => {
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce(SESSION);
    prismaMock.participant.findUnique.mockResolvedValueOnce({ id: "p2", sessionId: "sess-1" });
    prismaMock.poll.findUnique.mockResolvedValueOnce(POLL);
    prismaMock.vote.create.mockResolvedValueOnce({});
    prismaMock.vote.groupBy.mockResolvedValueOnce([
      { optionId: "opt-1", _count: { _all: 3 } },
      { optionId: "opt-2", _count: { _all: 1 } },
    ]);

    const client = connect();
    await new Promise<void>((resolve, reject) => {
      client.once("sessionJoined", () => resolve());
      client.once("error", reject);
      client.emit("joinSession", { sessionId: "sess-1", participantId: "p2", nickname: "bob" });
    });

    const update = await new Promise<Record<string, number>>((resolve) => {
      client.once("voteUpdate", resolve);
      client.emit("vote", { pollId: "poll-1", optionId: "opt-1", participantId: "p2" });
    });
    expect(update).toEqual({ "opt-1": 3, "opt-2": 1 });
    client.disconnect();
  });

  it("startPoll broadcasts pollStarted with the option list", async () => {
    prismaMock.poll.findUnique.mockResolvedValueOnce(POLL);
    prismaMock.loudroomSession.findUnique.mockResolvedValueOnce(SESSION);
    prismaMock.participant.findUnique.mockResolvedValueOnce({ id: "p3", sessionId: "sess-1" });

    const presenter = connect();
    const audience = connect();

    await new Promise<void>((resolve, reject) => {
      audience.once("sessionJoined", () => resolve());
      audience.once("error", reject);
      audience.emit("joinSession", { sessionId: "sess-1", participantId: "p3", nickname: "c" });
    });

    const started = await new Promise<{ id: string; question: string; options: Array<{ id: string; text: string }> }>((resolve) => {
      audience.once("pollStarted", resolve);
      presenter.emit("startPoll", { pollId: "poll-1" });
    });
    expect(started.id).toBe("poll-1");
    expect(started.options.map((o) => o.id)).toEqual(["opt-1", "opt-2"]);

    presenter.disconnect();
    audience.disconnect();
  });
});
