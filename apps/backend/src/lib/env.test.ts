import { describe, expect, it } from "vitest";
import { parseConfig } from "./env.js";

const validEnv = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
  FRONTEND_URL: "http://localhost:5173",
};

describe("parseConfig", () => {
  it("succeeds with only the required vars set", () => {
    const result = parseConfig(validEnv as NodeJS.ProcessEnv);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.PORT).toBe(3001);
    expect(result.data.NODE_ENV).toBe("development");
    expect(result.data.LOG_LEVEL).toBe("info");
  });

  it("coerces PORT from string to number", () => {
    const result = parseConfig({ ...validEnv, PORT: "4000" } as NodeJS.ProcessEnv);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.PORT).toBe(4000);
  });

  it("rejects a secret shorter than 32 characters", () => {
    const result = parseConfig({ ...validEnv, BETTER_AUTH_SECRET: "short" } as NodeJS.ProcessEnv);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.includes("BETTER_AUTH_SECRET"))).toBe(true);
  });

  it("rejects a non-URL DATABASE_URL", () => {
    const result = parseConfig({ ...validEnv, DATABASE_URL: "not-a-url" } as NodeJS.ProcessEnv);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.includes("DATABASE_URL"))).toBe(true);
  });

  it("rejects an unknown NODE_ENV value", () => {
    const result = parseConfig({ ...validEnv, NODE_ENV: "staging" } as NodeJS.ProcessEnv);
    expect(result.success).toBe(false);
  });

  it("reports every missing required var at once", () => {
    const result = parseConfig({} as NodeJS.ProcessEnv);
    expect(result.success).toBe(false);
    if (result.success) return;
    const joined = result.errors.join("\n");
    expect(joined).toContain("DATABASE_URL");
    expect(joined).toContain("BETTER_AUTH_SECRET");
    expect(joined).toContain("BETTER_AUTH_URL");
    expect(joined).toContain("FRONTEND_URL");
  });
});
