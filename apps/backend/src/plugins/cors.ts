import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { config } from "../config.js";

const corsPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(fastifyCors, {
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
};

export default fp(corsPlugin, { name: "cors" });
