import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { generateJoinCode } from "../lib/join-code.js";

const createSessionBody = z.object({
  title: z.string().trim().min(1).max(120),
});

const updateStatusBody = z.object({
  status: z.enum(["WAITING", "ACTIVE", "ENDED"]),
});

const joinSessionBody = z.object({
  nickname: z.string().trim().min(1).max(40),
});

const idParam = z.object({ id: z.string().uuid() });
const codeParam = z.object({ code: z.string().min(4).max(12) });

const MAX_CODE_ATTEMPTS = 5;

async function generateUniqueJoinCode(app: FastifyInstance): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateJoinCode();
    const existing = await app.prisma.loudroomSession.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not allocate a unique join code");
}

const sessionsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/sessions", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    return app.prisma.loudroomSession.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/sessions", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    const body = createSessionBody.parse(req.body);
    const joinCode = await generateUniqueJoinCode(app);
    return app.prisma.loudroomSession.create({
      data: { title: body.title, joinCode, userId: ctx.user.id },
    });
  });

  app.get("/sessions/:id", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    const { id } = idParam.parse(req.params);
    const session = await app.prisma.loudroomSession.findUnique({ where: { id } });
    if (!session || session.userId !== ctx.user.id) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    return session;
  });

  app.patch("/sessions/:id/status", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    const { id } = idParam.parse(req.params);
    const { status } = updateStatusBody.parse(req.body);
    const session = await app.prisma.loudroomSession.findUnique({ where: { id } });
    if (!session || session.userId !== ctx.user.id) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    return app.prisma.loudroomSession.update({ where: { id }, data: { status } });
  });

  // Public — used by audience to look up a session by its join code.
  app.get("/sessions/by-code/:code", async (req, reply) => {
    const { code } = codeParam.parse(req.params);
    const session = await app.prisma.loudroomSession.findUnique({
      where: { joinCode: code.toUpperCase() },
      select: { id: true, title: true, status: true, joinCode: true },
    });
    if (!session) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    return session;
  });

  // Public — audience members register an anonymous Participant.
  app.post("/sessions/:id/participants", async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { nickname } = joinSessionBody.parse(req.body);
    const session = await app.prisma.loudroomSession.findUnique({ where: { id } });
    if (!session) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    if (session.status === "ENDED") {
      reply.code(409).send({ error: "session_ended" });
      return;
    }
    return app.prisma.participant.create({ data: { sessionId: id, nickname } });
  });
};

export default sessionsRoutes;
