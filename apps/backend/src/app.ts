import Fastify from "fastify";
import { config } from "./config.js";
import authPlugin from "./plugins/auth.js";
import corsPlugin from "./plugins/cors.js";
import prismaPlugin from "./plugins/prisma.js";
import healthRoutes from "./routes/health.js";
import pollsRoutes from "./routes/polls.js";
import sessionsRoutes from "./routes/sessions.js";

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
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(sessionsRoutes, { prefix: "/api" });
  await app.register(pollsRoutes, { prefix: "/api" });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
