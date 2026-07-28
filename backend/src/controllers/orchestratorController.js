import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as orchestratorService from "../services/orchestratorService.js";

// POST /api/v1/orchestrator/analyze
// Body: { expenses?: Array, months?: number, refresh?: boolean }
const analyze = asyncHandler(async (req, res) => {
  const expenses     = Array.isArray(req.body.expenses) ? req.body.expenses : [];
  const months       = Math.min(Math.max(parseInt(req.body.months, 10) || 6, 1), 12);
  const forceRefresh = req.body.refresh === true;

  const result = await orchestratorService.runFullAnalysis(
    req.user._id,
    expenses,
    months,
    forceRefresh
  );

  const message = result.fromCache
    ? "Full analysis retrieved from cache."
    : `Full analysis pipeline completed — status: ${result.pipelineStatus}.`;

  ApiResponse.ok(res, result, message);
});

// DELETE /api/v1/orchestrator/cache
const invalidateCache = asyncHandler(async (req, res) => {
  orchestratorService.invalidateOrchestratorCache(req.user._id);
  ApiResponse.ok(res, null, "Orchestrator cache cleared. Next request will run a fresh pipeline.");
});

export { analyze, invalidateCache };
