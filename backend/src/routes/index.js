import { Router }            from "express";
import authRoutes            from "./authRoutes.js";
import expenseRoutes         from "./expenseRoutes.js";
import categorizerRoutes     from "./categorizerRoutes.js";
import patternAnalyzerRoutes from "./patternAnalyzerRoutes.js";
import aiRoutes              from "./aiRoutes.js";
import savingsAdvisorRoutes  from "./savingsAdvisorRoutes.js";
import budgetPlannerRoutes   from "./budgetPlannerRoutes.js";
import orchestratorRoutes    from "./orchestratorRoutes.js";
import healthScoreRoutes     from "./healthScoreRoutes.js";
import monthlyReportRoutes   from "./monthlyReportRoutes.js";
import savingsGoalRoutes     from "./savingsGoalRoutes.js";
import notificationRoutes    from "./notificationRoutes.js";
import {
  authLimiter,
  aiLimiter,
  orchestratorLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

router.use("/auth",           authLimiter,         authRoutes);
router.use("/expenses",                            expenseRoutes);
router.use("/categorizer",    aiLimiter,           categorizerRoutes);
router.use("/analysis",       aiLimiter,           patternAnalyzerRoutes);
router.use("/ai",                              aiRoutes);
router.use("/savings",        aiLimiter,           savingsAdvisorRoutes);
router.use("/budget",         aiLimiter,           budgetPlannerRoutes);
router.use("/orchestrator",   orchestratorLimiter, orchestratorRoutes);
router.use("/health-score",   aiLimiter,           healthScoreRoutes);
router.use("/monthly-report", aiLimiter,           monthlyReportRoutes);
router.use("/savings-goals",                       savingsGoalRoutes);
router.use("/notifications",                       notificationRoutes);

export default router;
