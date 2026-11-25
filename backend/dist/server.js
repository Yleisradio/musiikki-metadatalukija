"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || "info" });
function createApp(trackApiUrl = process.env.TRACK_API_URL, timeoutMs = 10_000) {
    let upstreamUrl;
    if (trackApiUrl) {
        const url = new URL(trackApiUrl);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
            throw new Error("TRACK_API_URL must be an HTTP(S) URL without credentials or a fragment");
        }
        upstreamUrl = url.toString();
    }
    const app = (0, express_1.default)();
    app.get("/health", (_request, response) => {
        response.json({ status: "ok" });
    });
    app.post("/tracks", (request, response, next) => {
        if (!request.is("application/json")) {
            response.status(415).json({ error: "Content-Type must be application/json" });
            return;
        }
        next();
    }, express_1.default.json({
        limit: "1mb",
        verify: (_request, _response, body) => {
            if (body.length === 0)
                throw new Error("Empty request body");
        },
    }), async (request, response) => {
        if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
            response.status(400).json({ error: "Request body must be a JSON object" });
            return;
        }
        if (!upstreamUrl) {
            logger.error("Track API is not configured");
            response.status(503).json({ error: "Track API is not configured" });
            return;
        }
        const signal = AbortSignal.timeout(timeoutMs);
        try {
            const upstreamResponse = await fetch(upstreamUrl, {
                method: "POST",
                headers: { "content-type": "application/json", "accept": "application/json" },
                body: JSON.stringify(request.body),
                redirect: "manual",
                signal,
            });
            const body = Buffer.from(await upstreamResponse.arrayBuffer());
            const contentType = upstreamResponse.headers.get("content-type");
            const location = upstreamResponse.headers.get("location");
            if (contentType)
                response.setHeader("Content-Type", contentType);
            if (location)
                response.setHeader("Location", location);
            logger.info({ status: upstreamResponse.status }, "Track API responded");
            response.status(upstreamResponse.status).send(body);
        }
        catch (error) {
            const timeout = signal.aborted;
            logger.error({ err: error }, "Track API request failed");
            response.status(timeout ? 504 : 502).json({
                error: timeout ? "Track API request timed out" : "Track API request failed",
            });
        }
    });
    const handleError = (error, _request, response, _next) => {
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
    app.use(handleError);
    app.use((_request, response) => response.status(404).json({ error: "Not found" }));
    return app;
}
if (require.main === module) {
    const port = Number(process.env.PORT ?? 3001);
    createApp().listen(port, "0.0.0.0", () => logger.info({ port }, "Backend listening"));
}
