import express from "express";
import { HttpError } from "./errors";
import { logger } from "./logger";

export function createRoutes(trackApiUrl: string | undefined, timeoutMs: number) {
  let upstreamUrl: string | undefined;
  if (trackApiUrl) {
    const url = new URL(trackApiUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
      throw new Error("TRACK_API_URL must be an HTTP(S) URL without credentials or a fragment");
    }
    upstreamUrl = url.toString();
  }

  const router = express.Router();
  router.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  router.post("/tracks", (request, _response, next) => {
    if (!request.is("application/json")) {
      throw new HttpError(415, "Content-Type must be application/json");
    }
    next();
  }, express.json({
    limit: "1mb",
    verify: (_request, _response, body) => {
      if (body.length === 0) throw new Error("Empty request body");
    },
  }), async (request, response) => {
    if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
      throw new HttpError(400, "Request body must be a JSON object");
    }
    if (!upstreamUrl) {
      throw new HttpError(503, "Track API is not configured", "Track API is not configured");
    }

    const signal = AbortSignal.timeout(timeoutMs);
    let upstreamResponse: Response;
    let body: Buffer;
    try {
      upstreamResponse = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify(request.body),
        redirect: "manual",
        signal,
      });
      body = Buffer.from(await upstreamResponse.arrayBuffer());
    } catch (error) {
      const timeout = signal.aborted;
      throw new HttpError(
        timeout ? 504 : 502,
        timeout ? "Track API request timed out" : "Track API request failed",
        "Track API request failed",
        { cause: error },
      );
    }
    const contentType = upstreamResponse.headers.get("content-type");
    const location = upstreamResponse.headers.get("location");
    if (contentType) response.setHeader("Content-Type", contentType);
    if (location) response.setHeader("Location", location);
    logger.info({ status: upstreamResponse.status }, "Track API responded");
    response.status(upstreamResponse.status).send(body);
  });

  return router;
}
