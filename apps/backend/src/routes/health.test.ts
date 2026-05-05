import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../prisma.js", () => ({
  prisma: {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

vi.mock("../plugins/auth.js", async () => {
  const fp = (await import("fastify-plugin")).default;
  return {
    default: fp(async (app) => {
      app.decorateRequest("auth", null);
      app.decorate("requireAuth", async (_req: unknown, reply: { code: (n: number) => { send: (b: unknown) => void } }) => {
        reply.code(401).send({ error: "unauthorized" });
        return undefined;
      });
    }, { name: "auth" }),
  };
});

type App = Awaited<ReturnType<typeof import("../app.js").buildApp>>;

let app: App;

beforeAll(async () => {
  const { buildApp } = await import("../app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("health routes", () => {
  it("GET /health returns ok with uptime", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });

  it("GET /health/ready pings the database via prisma", async () => {
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ready" });

    const { prisma } = await import("../prisma.js");
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});
