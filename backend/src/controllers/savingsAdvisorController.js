import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as savingsAdvisorService from "../services/savingsAdvisorService.js";

// GET /api/v1/savings?months=6&refresh=false
const getSavingsAdvice = asyncHandler(async (req, res) => {
  const months       = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 12);
  const forceRefresh = req.query.refresh === "true";

  const result = await savingsAdvisorService.getSavingsAdvice(
    req.user._id,
    months,
    forceRefresh
  );

  const message = result.fromCache
    ? "Savings advice retrieved from cache."
    : "Savings advice generated successfully.";

  ApiResponse.ok(res, result, message);
});

// DELETE /api/v1/savings/cache
const invalidateCache = asyncHandler(async (req, res) => {
  savingsAdvisorService.invalidateSavingsCache(req.user._id);
  ApiResponse.ok(res, null, "Savings cache cleared. Next request will regenerate fresh advice.");
});

export { getSavingsAdvice, invalidateCache };
