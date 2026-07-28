import { Router }          from "express";
import { query, param }   from "express-validator";
import * as patternController from "../controllers/patternAnalyzerController.js";
import authMiddleware     from "../middleware/authMiddleware.js";
import validate           from "../middleware/validate.js";
import { aiLimiter }      from "../middleware/rateLimiter.js";
import { VALIDATORS }     from "../agents/patternAnalyzerAgent.js";

const router = Router();

// All analysis routes require authentication
router.use(authMiddleware);

const VALID_DIMENSIONS = Object.keys(VALIDATORS);

// ─── Validation Chains ────────────────────────────────────────────────────────

const monthsValidator = query("months")
  .optional()
  .isInt({ min: 1, max: 12 }).withMessage("months must be an integer between 1 and 12.")
  .toInt();

const dimensionValidator = param("dimension")
  .isIn(VALID_DIMENSIONS)
  .withMessage(`dimension must be one of: ${VALID_DIMENSIONS.join(", ")}.`);

const refreshValidator = query("refresh")
  .optional()
  .isBoolean().withMessage("refresh must be true or false.");

// ─── Routes ───────────────────────────────────────────────────────────────────

// Full 4-dimension analysis (cached, 30 min TTL)
router.get("/patterns",
  aiLimiter,
  [monthsValidator, refreshValidator],
  validate,
  patternController.getPatternAnalysis
);

// Single dimension analysis (always fresh)
router.get("/patterns/:dimension",
  aiLimiter,
  [dimensionValidator, monthsValidator],
  validate,
  patternController.getDimensionAnalysis
);

// Invalidate cached analysis (no AI call — no rate limit needed)
router.delete("/patterns/cache",
  patternController.invalidateCache
);

export default router;
