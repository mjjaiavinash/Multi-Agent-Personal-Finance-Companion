import api from "./axiosInstance";

/** POST /api/v1/health-score/compute */
export const computeHealthScore = (monthlyIncome, monthlyBudget = 0) =>
  api.post("/health-score/compute", { monthlyIncome, monthlyBudget });

/** GET /api/v1/health-score/latest */
export const getLatestHealthScore = () => api.get("/health-score/latest");

/** GET /api/v1/health-score/history */
export const getHealthScoreHistory = (limit = 10) =>
  api.get("/health-score/history", { params: { limit } });
