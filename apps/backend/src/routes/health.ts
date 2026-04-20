import type { FastifyInstance, FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

  app.get("/health/ready", async () => {
    await app.prisma.$queryRaw`SELECT 1`;
    return { status: "ready" };
  });
};

export default healthRoutes;
