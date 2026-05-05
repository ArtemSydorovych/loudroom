import type { Server as HttpServer } from "node:http";
import type { PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../../packages/types/src/socket.js";
import { config } from "../config.js";

type SocketData = {
  participantId?: string;
  sessionId?: string;
};

type InterServerEvents = Record<string, never>;

export type Hub = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type HubSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const sessionRoom = (sessionId: string) => `session:${sessionId}`;

export function createHub(httpServer: HttpServer, deps: { prisma: PrismaClient; log: FastifyBaseLogger }): Hub {
  const io: Hub = new SocketIOServer(httpServer, {
    cors: { origin: config.FRONTEND_URL, credentials: true },
    path: "/socket.io",
  });

  io.on("connection", (socket) => attachHandlers(io, socket, deps));

  return io;
}

function attachHandlers(io: Hub, socket: HubSocket, deps: { prisma: PrismaClient; log: FastifyBaseLogger }) {
  const { prisma, log } = deps;

  socket.on("joinSession", async ({ sessionId, participantId, nickname }) => {
    try {
      const session = await prisma.loudroomSession.findUnique({ where: { id: sessionId } });
      if (!session) {
        socket.emit("error", "session_not_found");
        return;
      }
      if (session.status === "ENDED") {
        socket.emit("error", "session_ended");
        return;
      }

      const participant = await prisma.participant.findUnique({ where: { id: participantId } });
      if (!participant || participant.sessionId !== sessionId) {
        socket.emit("error", "participant_not_in_session");
        return;
      }

      socket.data.sessionId = sessionId;
      socket.data.participantId = participantId;
      await socket.join(sessionRoom(sessionId));

      socket.emit("sessionJoined", { id: session.id, title: session.title, status: session.status });
      const count = io.sockets.adapter.rooms.get(sessionRoom(sessionId))?.size ?? 0;
      io.to(sessionRoom(sessionId)).emit("participantCountUpdate", count);
      log.debug({ sessionId, participantId, nickname }, "socket joined session");
    } catch (err) {
      log.error({ err }, "joinSession failed");
      socket.emit("error", "internal_error");
    }
  });

  socket.on("vote", async ({ pollId, optionId, participantId }) => {
    try {
      const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: true } });
      if (!poll) return socket.emit("error", "poll_not_found");
      if (!poll.options.some((o) => o.id === optionId)) {
        return socket.emit("error", "option_not_in_poll");
      }
      if (socket.data.sessionId !== poll.sessionId) {
        return socket.emit("error", "not_in_session");
      }

      await prisma.vote.create({ data: { pollId, optionId, participantId } });
      const counts = await tallyVotes(prisma, pollId);
      io.to(sessionRoom(poll.sessionId)).emit("voteUpdate", counts);
    } catch (err) {
      log.error({ err }, "vote failed");
      socket.emit("error", "internal_error");
    }
  });

  socket.on("submitQuestion", async ({ sessionId, participantId, text }) => {
    try {
      if (socket.data.sessionId !== sessionId) {
        return socket.emit("error", "not_in_session");
      }
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > 500) {
        return socket.emit("error", "invalid_question");
      }
      const question = await prisma.question.create({
        data: { sessionId, participantId, text: trimmed },
      });
      io.to(sessionRoom(sessionId)).emit("questionReceived", {
        id: question.id,
        text: question.text,
        participantId: question.participantId,
      });
    } catch (err) {
      log.error({ err }, "submitQuestion failed");
      socket.emit("error", "internal_error");
    }
  });

  // Presenter-only handlers. Authentication for the presenter side will be
  // wired in a follow-up that shares the better-auth cookie with the socket
  // handshake; for now anyone in the session room can trigger them, and the
  // REST API is the canonical write path for presenter actions.
  socket.on("startPoll", async ({ pollId }) => {
    try {
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      });
      if (!poll) return socket.emit("error", "poll_not_found");
      io.to(sessionRoom(poll.sessionId)).emit("pollStarted", {
        id: poll.id,
        question: poll.question,
        options: poll.options.map((o) => ({ id: o.id, text: o.text })),
        ...(poll.timeLimitSeconds !== null ? { timeLimitSeconds: poll.timeLimitSeconds } : {}),
      });
    } catch (err) {
      log.error({ err }, "startPoll failed");
      socket.emit("error", "internal_error");
    }
  });

  socket.on("endPoll", async ({ pollId }) => {
    try {
      const poll = await prisma.poll.findUnique({ where: { id: pollId } });
      if (!poll) return socket.emit("error", "poll_not_found");
      const counts = await tallyVotes(prisma, pollId);
      io.to(sessionRoom(poll.sessionId)).emit("pollEnded", {
        counts,
        ...(poll.correctOptionId ? { correctOptionId: poll.correctOptionId } : {}),
      });
    } catch (err) {
      log.error({ err }, "endPoll failed");
      socket.emit("error", "internal_error");
    }
  });

  socket.on("approveQuestion", async ({ questionId }) => {
    try {
      const question = await prisma.question.update({
        where: { id: questionId },
        data: { isApproved: true },
      });
      io.to(sessionRoom(question.sessionId)).emit("questionReceived", {
        id: question.id,
        text: question.text,
        participantId: question.participantId,
      });
    } catch (err) {
      log.error({ err }, "approveQuestion failed");
      socket.emit("error", "internal_error");
    }
  });

  socket.on("disconnect", () => {
    if (!socket.data.sessionId) return;
    const room = sessionRoom(socket.data.sessionId);
    const count = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    io.to(room).emit("participantCountUpdate", count);
  });
}

async function tallyVotes(prisma: PrismaClient, pollId: string): Promise<Record<string, number>> {
  const grouped = await prisma.vote.groupBy({
    by: ["optionId"],
    where: { pollId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of grouped) counts[row.optionId] = row._count._all;
  return counts;
}
