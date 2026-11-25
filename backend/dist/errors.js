"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.HttpError = void 0;
const logger_1 = require("./logger");
class HttpError extends Error {
    status;
    logMessage;
    constructor(status, message, logMessage, options) {
        super(message, options);
        this.status = status;
        this.logMessage = logMessage;
    }
}
exports.HttpError = HttpError;
const errorHandler = (error, _request, response, _next) => {
    if (error instanceof HttpError) {
        if (error.logMessage) {
            if (error.cause) {
                logger_1.logger.error({ err: error.cause }, error.logMessage);
            }
            else {
                logger_1.logger.error(error.logMessage);
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
    logger_1.logger.error({ err: error }, "Request failed");
    response.status(500).json({ error: "Internal server error" });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (_request, response) => {
    response.status(404).json({ error: "Not found" });
};
exports.notFoundHandler = notFoundHandler;
