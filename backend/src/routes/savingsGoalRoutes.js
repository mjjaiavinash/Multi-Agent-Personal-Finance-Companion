import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  createGoal,
  getGoals,
  updateGoal,
  addFunds,
  deleteGoal,
  generateAISuggestions,
} from "../controllers/savingsGoalController.js";

const router = Router();
router.use(authMiddleware);

router.post("/", createGoal);
router.get("/", getGoals);
router.patch("/:id", updateGoal);
router.post("/:id/add-funds", addFunds);
router.delete("/:id", deleteGoal);
router.post("/:id/ai-suggestions", aiLimiter, generateAISuggestions);

export default router;
