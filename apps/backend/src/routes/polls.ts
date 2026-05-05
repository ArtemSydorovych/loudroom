import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const pollOptionInput = z.object({
  text: z.string().trim().min(1).max(200),
});

const createPollBody = z.object({
  question: z.string().trim().min(1).max(500),
  type: z.enum(["MULTIPLE_CHOICE", "QUIZ"]),
  timeLimitSeconds: z.number().int().positive().max(3600).optional(),
  options: z.array(pollOptionInput).min(2).max(10),
  correctOptionIndex: z.number().int().nonnegative().optional(),
});

const sessionIdParam = z.object({ sessionId: z.string().uuid() });
const pollIdParam = z.object({ id: z.string().uuid() });

const pollsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/sessions/:sessionId/polls", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    const { sessionId } = sessionIdParam.parse(req.params);
    const session = await app.prisma.loudroomSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== ctx.user.id) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    return app.prisma.poll.findMany({
      where: { sessionId },
      orderBy: { orderIndex: "asc" },
      include: { options: { orderBy: { orderIndex: "asc" } } },
    });
  });

  app.post("/sessions/:sessionId/polls", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    const { sessionId } = sessionIdParam.parse(req.params);
    const body = createPollBody.parse(req.body);

    const session = await app.prisma.loudroomSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== ctx.user.id) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    if (body.correctOptionIndex !== undefined && body.correctOptionIndex >= body.options.length) {
      reply.code(400).send({ error: "correct_option_out_of_range" });
      return;
    }

    const nextIndex = await app.prisma.poll.count({ where: { sessionId } });

    return app.prisma.$transaction(async (tx) => {
      const poll = await tx.poll.create({
        data: {
          sessionId,
          question: body.question,
          type: body.type,
          orderIndex: nextIndex,
          timeLimitSeconds: body.timeLimitSeconds ?? null,
        },
      });
      const options = await Promise.all(
        body.options.map((option, index) =>
          tx.pollOption.create({
            data: { pollId: poll.id, text: option.text, orderIndex: index },
          }),
        ),
      );
      const correctOptionId =
        body.correctOptionIndex !== undefined ? options[body.correctOptionIndex]?.id ?? null : null;
      const updated = correctOptionId
        ? await tx.poll.update({ where: { id: poll.id }, data: { correctOptionId } })
        : poll;
      return { ...updated, options };
    });
  });

  app.delete("/polls/:id", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    const { id } = pollIdParam.parse(req.params);
    const poll = await app.prisma.poll.findUnique({ where: { id }, include: { session: true } });
    if (!poll || poll.session.userId !== ctx.user.id) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    await app.prisma.poll.delete({ where: { id } });
    reply.code(204).send();
  });
};

export default pollsRoutes;
