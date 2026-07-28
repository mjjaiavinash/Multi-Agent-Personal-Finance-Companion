import api from "./axiosInstance";

/**
 * Fetches AI Savings Advisory analysis.
 * Maps to GET /api/v1/savings?months=6&refresh=false&income=50000
 */
export const getSavingsAdvice = (months = 6, forceRefresh = false, income = 0) =>
  api.get("/savings", { params: { months, refresh: forceRefresh, income } });

/**
 * Clears the cached savings advice.
 * Maps to DELETE /api/v1/savings/cache
 */
export const clearSavingsCache = () => api.delete("/savings/cache");
