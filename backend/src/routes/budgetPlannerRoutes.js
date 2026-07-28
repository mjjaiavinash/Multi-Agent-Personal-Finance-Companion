import { Router } from "express";
import { query }   from "express-validator";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter }  from "../middleware/rateLimiter.js";
import validate       from "../middleware/validate.js";
import {
  getBudgetPlan,
  invalidateCache,
} from "../controllers/budgetPlannerController.js";

const router = Router();

// All budget routes require authentication
router.use(authMiddleware);

// GET /api/v1/budget?months=3&refresh=false
router.get(
  "/",
  aiLimiter,
  [
    query("months")
      .optional()
      .isInt({ min: 1, max: 6 })
      .withMessage("months must be an integer between 1 and 6."),
    query("refresh")
      .optional()
      .isBoolean()
      .withMessage("refresh must be a boolean."),
  ],
  validate,
  getBudgetPlan
);

// DELETE /api/v1/budget/cache
router.delete("/cache", invalidateCache);

export default router;
