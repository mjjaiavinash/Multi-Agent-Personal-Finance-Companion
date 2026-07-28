import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as budgetPlannerService from "../services/budgetPlannerService.js";

// GET /api/v1/budget?months=3&refresh=false
const getBudgetPlan = asyncHandler(async (req, res) => {
  const months       = Math.min(Math.max(parseInt(req.query.months, 10) || 3, 1), 6);
  const forceRefresh = req.query.refresh === "true";

  const result = await budgetPlannerService.getBudgetPlan(
    req.user._id,
    months,
    forceRefresh
  );

  const message = result.fromCache
    ? "Budget plan retrieved from cache."
    : "Budget plan generated successfully.";

  ApiResponse.ok(res, result, message);
});

// DELETE /api/v1/budget/cache
const invalidateCache = asyncHandler(async (req, res) => {
  budgetPlannerService.invalidateBudgetCache(req.user._id);
  ApiResponse.ok(res, null, "Budget cache cleared. Next request will regenerate a fresh plan.");
});

export { getBudgetPlan, invalidateCache };
