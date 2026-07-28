import api from "./axiosInstance";

/**
 * Fetches a Gemini-powered monthly budget plan.
 * Maps to GET /api/v1/budget?months=3&refresh=false
 *
 * @param {number}  months       - History window used to build the plan (1–6)
 * @param {boolean} forceRefresh - Bypass the 45-min server-side cache
 */
export const getBudgetPlan = (months = 3, forceRefresh = false) =>
  api.get("/budget", { params: { months, refresh: forceRefresh } });

/**
 * Invalidates the server-side budget cache for the authenticated user.
 * Maps to DELETE /api/v1/budget/cache
 */
export const invalidateBudgetCache = () => api.delete("/budget/cache");
