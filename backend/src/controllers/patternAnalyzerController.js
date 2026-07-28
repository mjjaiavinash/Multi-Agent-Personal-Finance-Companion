import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as patternService from "../services/patternAnalyzerService.js";

// GET /api/v1/analysis/patterns?months=6&refresh=false
const getPatternAnalysis = asyncHandler(async (req, res) => {
  const months       = parseInt(req.query.months, 10) || 6;
  const forceRefresh = req.query.refresh === "true";

  const result = await patternService.getPatternAnalysis(
    req.user._id,
    months,
    forceRefresh
  );

  const message = result.fromCache
    ? "Pattern analysis retrieved from cache."
    : "Pattern analysis generated successfully.";

  ApiResponse.ok(res, result, message);
});

// GET /api/v1/analysis/patterns/:dimension?months=6
// dimension: highestSpendingCategory | monthlyTrend | frequentExpenses | unnecessaryExpenses
const getDimensionAnalysis = asyncHandler(async (req, res) => {
  const { dimension } = req.params;
  const months        = parseInt(req.query.months, 10) || 6;

  const result = await patternService.getDimensionAnalysis(
    req.user._id,
    dimension,
    months
  );

  ApiResponse.ok(res, result, `${dimension} analysis generated successfully.`);
});

// DELETE /api/v1/analysis/patterns/cache
const invalidateCache = asyncHandler(async (req, res) => {
  patternService.invalidateCache(req.user._id);
  ApiResponse.ok(res, null, "Analysis cache cleared. Next request will regenerate fresh analysis.");
});

export { getPatternAnalysis, getDimensionAnalysis, invalidateCache };
