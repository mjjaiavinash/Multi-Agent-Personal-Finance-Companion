import asyncHandler  from "../utils/asyncHandler.js";
import ApiResponse   from "../utils/ApiResponse.js";
import ApiError      from "../utils/ApiError.js";
import * as svc      from "../services/healthScoreService.js";

/** POST /api/v1/health-score/compute */
export const compute = asyncHandler(async (req, res) => {
  const { monthlyIncome, monthlyBudget = 0 } = req.body;

  if (!monthlyIncome || isNaN(Number(monthlyIncome))) {
    throw ApiError.badRequest("monthlyIncome is required and must be a number.");
  }

  const result = await svc.computeAndSave(
    req.user._id,
    Number(monthlyIncome),
    Number(monthlyBudget)
  );

  ApiResponse.ok(res, { healthScore: result }, "Health score computed successfully.");
});

/** GET /api/v1/health-score/latest */
export const latest = asyncHandler(async (req, res) => {
  const result = await svc.getLatest(req.user._id);
  ApiResponse.ok(res, { healthScore: result }, "Latest health score retrieved.");
});

/** GET /api/v1/health-score/history */
export const history = asyncHandler(async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 10, 30);
  const result = await svc.getHistory(req.user._id, limit);
  ApiResponse.ok(res, { history: result }, "Score history retrieved.");
});
