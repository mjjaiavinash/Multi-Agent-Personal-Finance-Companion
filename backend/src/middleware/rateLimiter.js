import rateLimit from "express-rate-limit";
import env from "../config/env.js";

const rateLimitHandler = (_req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
  });
};

// In development, use a passthrough middleware so rate limits never block testing
const noLimit = (_req, _res, next) => next();

const make = (opts) => env.isDev ? noLimit : rateLimit({ ...opts, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });

export const authLimiter        = make({ windowMs: 15 * 60 * 1000, max: 20  });
export const apiLimiter         = make({ windowMs: 15 * 60 * 1000, max: 200 });
export const aiLimiter          = make({ windowMs: 60 * 60 * 1000, max: 200 });
export const orchestratorLimiter = make({ windowMs: 60 * 60 * 1000, max: 50  });
