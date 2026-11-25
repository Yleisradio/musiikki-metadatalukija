"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const routes_1 = require("./routes");
function createApp(trackApiUrl = process.env.TRACK_API_URL, timeoutMs = 10_000) {
    const app = (0, express_1.default)();
    app.use((0, routes_1.createRoutes)(trackApiUrl, timeoutMs));
    app.use(errors_1.errorHandler);
    app.use(errors_1.notFoundHandler);
    return app;
}
if (require.main === module) {
    const port = Number(process.env.PORT ?? 3001);
    createApp().listen(port, "0.0.0.0", () => logger_1.logger.info({ port }, "Backend listening"));
}
