import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as svc from "../services/savingsGoalService.js";

/** POST /api/v1/savings-goals */
export const createGoal = asyncHandler(async (req, res) => {
  const result = await svc.createGoal(req.user._id, req.body);
  ApiResponse.created(res, { goal: result }, "Savings goal created successfully.");
});

/** GET /api/v1/savings-goals */
export const getGoals = asyncHandler(async (req, res) => {
  const result = await svc.getGoals(req.user._id);
  ApiResponse.ok(res, { goals: result }, "Savings goals retrieved.");
});

/** PATCH /api/v1/savings-goals/:id */
export const updateGoal = asyncHandler(async (req, res) => {
  const result = await svc.updateGoal(req.user._id, req.params.id, req.body);
  ApiResponse.ok(res, { goal: result }, "Savings goal updated.");
});

/** POST /api/v1/savings-goals/:id/add-funds */
export const addFunds = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const result = await svc.addFunds(req.user._id, req.params.id, amount);
  ApiResponse.ok(res, { goal: result }, "Funds added to savings goal.");
});

/** DELETE /api/v1/savings-goals/:id */
export const deleteGoal = asyncHandler(async (req, res) => {
  const result = await svc.deleteGoal(req.user._id, req.params.id);
  ApiResponse.ok(res, result, "Savings goal deleted.");
});

/** POST /api/v1/savings-goals/:id/ai-suggestions */
export const generateAISuggestions = asyncHandler(async (req, res) => {
  const result = await svc.generateGoalAISuggestions(req.user._id, req.params.id);
  ApiResponse.ok(res, { goal: result }, "AI acceleration suggestions generated.");
});
