import { config as loadEnv } from "dotenv";
import { type Config, parseConfig } from "./lib/env.js";

loadEnv();

function loadConfig(): Config {
  const parsed = parseConfig(process.env);
  if (parsed.success) return parsed.data;
  console.error("Invalid environment variables:");
  for (const err of parsed.errors) console.error(`  - ${err}`);
  process.exit(1);
}

export const config: Config = loadConfig();
export type { Config } from "./lib/env.js";
