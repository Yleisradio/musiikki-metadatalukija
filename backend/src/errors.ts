import { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly logMessage?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    if (error.logMessage) {
      if (error.cause) {
        logger.error({ err: error.cause }, error.logMessage);
      } else {
        logger.error(error.logMessage);
      }
    }
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof Error && "type" in error) {
    if (error.type === "entity.parse.failed" || error.type === "entity.verify.failed") {
      response.status(400).json({ error: "Invalid JSON" });
      return;
    }
    if (error.type === "entity.too.large") {
      response.status(413).json({ error: "Request body is too large" });
      return;
    }
    if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
      response.status(415).json({ error: "Unsupported request encoding" });
      return;
    }
  }
  logger.error({ err: error }, "Request failed");
  response.status(500).json({ error: "Internal server error" });
};

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: "Not found" });
};
