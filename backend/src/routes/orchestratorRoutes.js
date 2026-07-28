import { Router }      from "express";
import { body }        from "express-validator";
import authMiddleware  from "../middleware/authMiddleware.js";
import { orchestratorLimiter } from "../middleware/rateLimiter.js";
import validate        from "../middleware/validate.js";
import {
  analyze,
  invalidateCache,
} from "../controllers/orchestratorController.js";

const router = Router();

// All orchestrator routes require authentication
router.use(authMiddleware);

// POST /api/v1/orchestrator/analyze
// Runs the full 5-stage AI pipeline. Rate-limited to 5 req/hour
// because each request can make up to 5 Gemini API calls.
router.post(
  "/analyze",
  orchestratorLimiter,
  [
    body("expenses")
      .optional()
      .isArray()
      .withMessage("expenses must be an array."),
    body("expenses.*.title")
      .optional()
      .isString().trim().notEmpty()
      .withMessage("Each expense must have a non-empty title."),
    body("expenses.*.amount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Each expense amount must be a positive number."),
    body("months")
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage("months must be an integer between 1 and 12."),
    body("refresh")
      .optional()
      .isBoolean()
      .withMessage("refresh must be a boolean."),
  ],
  validate,
  analyze
);

// DELETE /api/v1/orchestrator/cache
router.delete("/cache", invalidateCache);

export default router;
