import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { logger } from "./logger";
import { createRoutes } from "./routes";

export function createApp(trackApiUrl = process.env.TRACK_API_URL, timeoutMs = 10_000) {
  const app = express();
  app.use(createRoutes(trackApiUrl, timeoutMs));
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3001);
  createApp().listen(port, "0.0.0.0", () => logger.info({ port }, "Backend listening"));
}
