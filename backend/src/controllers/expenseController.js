import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as expenseService           from "../services/expenseService.js";
import { invalidateSavingsCache }    from "../services/savingsAdvisorService.js";
import { invalidateCache }           from "../services/patternAnalyzerService.js";
import { invalidateBudgetCache }     from "../services/budgetPlannerService.js";
import { invalidateOrchestratorCache } from "../services/orchestratorService.js";

// Bust all AI caches after any expense mutation
const bustAllCaches = (userId) => {
  invalidateSavingsCache(userId);
  invalidateCache(userId);
  invalidateBudgetCache(userId);
  invalidateOrchestratorCache(userId);
};

// POST /api/v1/expenses
const createExpense = asyncHandler(async (req, res) => {
  const { title, amount, category, date, notes } = req.body;
  const expense = await expenseService.createExpense(req.user._id, {
    title, amount, category, date, notes,
  });
  bustAllCaches(req.user._id);
  ApiResponse.created(res, { expense }, "Expense created successfully.");
});

// GET /api/v1/expenses
const getExpenses = asyncHandler(async (req, res) => {
  const result = await expenseService.getExpenses(req.user._id, req.query);
  ApiResponse.ok(res, result);
});

// GET /api/v1/expenses/summary
const getExpenseSummary = asyncHandler(async (req, res) => {
  const summary = await expenseService.getExpenseSummary(req.user._id);
  ApiResponse.ok(res, summary);
});

// GET /api/v1/expenses/:id
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.user._id, req.params.id);
  ApiResponse.ok(res, { expense });
});

// PUT /api/v1/expenses/:id
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(
    req.user._id,
    req.params.id,
    req.body
  );
  bustAllCaches(req.user._id);
  ApiResponse.ok(res, { expense }, "Expense updated successfully.");
});

// DELETE /api/v1/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.user._id, req.params.id);
  bustAllCaches(req.user._id);
  ApiResponse.ok(res, null, "Expense deleted successfully.");
});

export {
  createExpense,
  getExpenses,
  getExpenseSummary,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
