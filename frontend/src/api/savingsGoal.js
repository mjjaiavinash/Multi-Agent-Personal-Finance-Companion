import api from "./axiosInstance";

/** POST /api/v1/savings-goals */
export const createSavingsGoal = (goalData) =>
  api.post("/savings-goals", goalData);

/** GET /api/v1/savings-goals */
export const getSavingsGoals = () =>
  api.get("/savings-goals");

/** PATCH /api/v1/savings-goals/:id */
export const updateSavingsGoal = (id, updateData) =>
  api.patch(`/savings-goals/${id}`, updateData);

/** POST /api/v1/savings-goals/:id/add-funds */
export const addSavingsGoalFunds = (id, amount) =>
  api.post(`/savings-goals/${id}/add-funds`, { amount });

/** DELETE /api/v1/savings-goals/:id */
export const deleteSavingsGoal = (id) =>
  api.delete(`/savings-goals/${id}`);

/** POST /api/v1/savings-goals/:id/ai-suggestions */
export const getSavingsGoalAISuggestions = (id) =>
  api.post(`/savings-goals/${id}/ai-suggestions`);
