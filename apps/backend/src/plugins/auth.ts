import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { type AuthSession, type AuthUser, auth } from "../lib/auth.js";

type AuthContext = { user: AuthUser; session: AuthSession };

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }

  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<AuthContext | undefined>;
  }
}

function toWebHeaders(req: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, String(value));
    }
  }
  return headers;
}

async function resolveSession(req: FastifyRequest): Promise<AuthContext | null> {
  const result = await auth.api.getSession({ headers: toWebHeaders(req) });
  if (!result) return null;
  return { user: result.user, session: result.session };
}

const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.decorateRequest("auth", null);

  app.addHook("onRequest", async (req) => {
    req.auth = await resolveSession(req);
  });

  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.auth) {
      reply.code(401).send({ error: "unauthorized" });
      return undefined;
    }
    return req.auth;
  });

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(req, reply) {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const init: RequestInit = {
        method: req.method,
        headers: toWebHeaders(req),
      };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        init.body = JSON.stringify(req.body);
      }
      const webReq = new Request(url, init);

      const response = await auth.handler(webReq);

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      reply.send(response.body ? await response.text() : null);
    },
  });

  app.get("/api/me", async (req, reply) => {
    const ctx = await app.requireAuth(req, reply);
    if (!ctx) return;
    return { user: ctx.user, session: ctx.session };
  });
};

export default fp(authPlugin, { name: "auth", dependencies: ["prisma"] });
