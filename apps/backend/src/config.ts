import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3001),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config: Config = parsed.data;
