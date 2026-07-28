import { Router } from "express";
import { query }   from "express-validator";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter }  from "../middleware/rateLimiter.js";
import validate       from "../middleware/validate.js";
import {
  getSavingsAdvice,
  invalidateCache,
} from "../controllers/savingsAdvisorController.js";

const router = Router();

// All savings routes require authentication
router.use(authMiddleware);

// GET /api/v1/savings?months=6&refresh=false
router.get(
  "/",
  aiLimiter,
  [
    query("months")
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage("months must be an integer between 1 and 12."),
    query("refresh")
      .optional()
      .isBoolean()
      .withMessage("refresh must be a boolean."),
    query("income")
      .optional()
      .isNumeric()
      .withMessage("income must be a valid number."),
  ],
  validate,
  getSavingsAdvice
);

// DELETE /api/v1/savings/cache
router.delete("/cache", invalidateCache);

export default router;
