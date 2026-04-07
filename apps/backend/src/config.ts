import { z } from "zod";

export type Config = z.infer<typeof configSchema>;

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3001),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
});

// TODO: implement — parse and export validated config from process.env
