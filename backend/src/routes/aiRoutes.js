import { Router }        from "express";
import { body, query }  from "express-validator";
import * as aiController from "../controllers/aiController.js";
import authMiddleware   from "../middleware/authMiddleware.js";
import validate         from "../middleware/validate.js";
import { aiLimiter }    from "../middleware/rateLimiter.js";

const router = Router();

// All AI routes require authentication and are rate-limited
router.use(authMiddleware);
router.use(aiLimiter);

// GET /api/v1/ai/analysis
// Returns Gemini-powered finance analysis based on expense summary
router.get("/analysis",
  aiController.getAnalysis
);

// GET /api/v1/ai/patterns?months=6&refresh=false
// Returns full spending pattern analysis (cached 30 min)
router.get("/patterns",
  [
    query("months")
      .optional()
      .isInt({ min: 1, max: 12 }).withMessage("months must be between 1 and 12.")
      .toInt(),
    query("refresh")
      .optional()
      .isBoolean().withMessage("refresh must be true or false."),
  ],
  validate,
  aiController.getPatterns
);

// GET /api/v1/ai/predict?months=6&refresh=false
// Returns AI spending predictions and time-series forecasts
router.get("/predict",
  [
    query("months")
      .optional()
      .isInt({ min: 1, max: 12 }).withMessage("months must be between 1 and 12.")
      .toInt(),
    query("refresh")
      .optional()
      .isBoolean().withMessage("refresh must be true or false."),
  ],
  validate,
  aiController.getPredictions
);

// POST /api/v1/ai/chat
// Sends a message to the finance chat agent
router.post("/chat",
  [
    body("message")
      .trim()
      .notEmpty().withMessage("Message is required.")
      .isLength({ max: 2000 }).withMessage("Message cannot exceed 2000 characters."),
    body("history")
      .optional()
      .isArray().withMessage("history must be an array."),
  ],
  validate,
  aiController.chat
);

export default router;
