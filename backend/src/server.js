import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";

import env from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import ApiError from "./utils/ApiError.js";

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize()); // Prevents NoSQL injection attacks
app.use(
  cors({
    origin:      env.clientUrl,
    credentials: true,
    methods:     ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Performance & Compression ────────────────────────────────────────────────
app.use(compression());

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.isDev) app.use(morgan("dev"));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Root & Health Endpoints ──────────────────────────────────────────────────
app.get(["/", "/api", "/api/v1"], (_req, res) =>
  res.status(200).json({
    status:      "ok",
    service:     "SpendSense AI API",
    version:     "v1",
    documentation: "/api/v1",
    env:         env.nodeEnv,
    time:        new Date().toISOString(),
  })
);

app.get("/health", (_req, res) =>
  res.status(200).json({
    status:  "ok",
    service: "SpendSense AI API",
    env:     env.nodeEnv,
    time:    new Date().toISOString(),
  })
);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1", routes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found.`));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[Server] Running in ${env.nodeEnv} mode on port ${env.port}`);
    console.log(`[Server] Health: http://localhost:${env.port}/health`);
    console.log(`[Server] API:    http://localhost:${env.port}/api/v1`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully`);
    // Force exit after 10s if connections hang
    const forceExit = setTimeout(() => {
      console.error("[Server] Forced exit after timeout");
      process.exit(1);
    }, 10_000);
    forceExit.unref(); // don't block event loop
    server.close(async () => {
      await disconnectDB();
      console.log("[Server] Process terminated");
      clearTimeout(forceExit);
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  // Unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error("[Server] Unhandled rejection:", err.message);
    shutdown("unhandledRejection");
  });
};

startServer();
