import { buildApp } from "./app.js";
import { config } from "./config.js";

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ host: "0.0.0.0", port: config.PORT });
  } catch (err) {
    app.log.error({ err }, "failed to start server");
    process.exit(1);
  }
}

void main();
