import api from "./axiosInstance";

/**
 * Fetches a Gemini-powered monthly budget plan.
 * Maps to GET /api/v1/budget?months=3&refresh=false
 *
 * @param {number}  months       - History window used to build the plan (1–6)
 * @param {boolean} forceRefresh - Bypass the 45-min server-side cache
 */
export const getBudgetPlan = (months = 3, forceRefresh = false, monthlyIncome = 0) =>
  api.get("/budget", { params: { months, refresh: forceRefresh, monthlyIncome } });

/**
 * Invalidates the server-side budget cache for the authenticated user.
 * Maps to DELETE /api/v1/budget/cache
 */
export const invalidateBudgetCache = () => api.delete("/budget/cache");

/**
 * Downloads Budget Plan PDF for a given income
 * Maps to GET /api/v1/budget/pdf?income=50000
 */
export const downloadBudgetPlanPDF = (income) =>
  api.get("/budget/pdf", {
    params: { income },
    responseType: "blob",
  });
