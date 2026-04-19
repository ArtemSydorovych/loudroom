import Fastify from "fastify";
import { config } from "./config.js";
import corsPlugin from "./plugins/cors.js";
import prismaPlugin from "./plugins/prisma.js";
import healthRoutes from "./routes/health.js";

export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === "development"
        ? {
            level: config.LOG_LEVEL,
            transport: {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            },
          }
        : { level: config.LOG_LEVEL },
    trustProxy: true,
  });

  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  await app.register(healthRoutes);

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
