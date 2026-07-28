import api from "./axiosInstance";

/**
 * Runs the full 5-stage AI orchestration pipeline.
 * Maps to POST /api/v1/orchestrator/analyze
 *
 * Rate-limited to 5 req/hour on the backend — use sparingly.
 *
 * @param {number}  months       - History window for context building (1–12)
 * @param {boolean} forceRefresh - Bypass the 60-min server-side cache
 * @param {Array}   expenses     - Optional raw expenses for stage 1 categorization
 */
export const runOrchestratorAnalysis = (months = 6, forceRefresh = false, expenses = []) =>
  api.post("/orchestrator/analyze", { months, refresh: forceRefresh, expenses });

/**
 * Invalidates the orchestrator cache for the authenticated user.
 * Maps to DELETE /api/v1/orchestrator/cache
 */
export const invalidateOrchestratorCache = () => api.delete("/orchestrator/cache");
