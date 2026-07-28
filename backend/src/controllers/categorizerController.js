import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as categorizerService from "../services/categorizerService.js";

// POST /api/v1/categorizer/suggest
// Body: { title, amount, notes? }
const suggestCategory = asyncHandler(async (req, res) => {
  const { title, amount, notes } = req.body;
  const result = await categorizerService.suggestCategory({ title, amount, notes });
  ApiResponse.ok(res, result, "Category suggestion generated.");
});

// POST /api/v1/categorizer/suggest/batch
// Body: { expenses: [{ id, title, amount, notes? }] }
const suggestBatch = asyncHandler(async (req, res) => {
  const { expenses } = req.body;
  const results = await categorizerService.suggestBatch(expenses);
  ApiResponse.ok(res, { results, count: results.length }, "Batch suggestions generated.");
});

// PATCH /api/v1/categorizer/apply/:expenseId
// Categorizes one existing expense and saves the result to DB
const applyToExpense = asyncHandler(async (req, res) => {
  const { confidenceThreshold } = req.body;
  const result = await categorizerService.applyToExpense(
    req.user._id,
    req.params.expenseId,
    confidenceThreshold ? parseFloat(confidenceThreshold) : undefined
  );
  const message = result.updated
    ? `Expense re-categorized to "${result.result.modelCategory}".`
    : `Category not updated. ${result.skippedReason}.`;
  ApiResponse.ok(res, result, message);
});

// POST /api/v1/categorizer/apply/all
// Bulk re-categorizes all of the authenticated user's expenses
const applyToAllExpenses = asyncHandler(async (req, res) => {
  const { confidenceThreshold } = req.body;
  const result = await categorizerService.applyToAllExpenses(
    req.user._id,
    confidenceThreshold ? parseFloat(confidenceThreshold) : undefined
  );
  ApiResponse.ok(
    res,
    result,
    `Processed ${result.processed} expenses. Updated: ${result.updated}, Skipped: ${result.skipped}.`
  );
});

export { suggestCategory, suggestBatch, applyToExpense, applyToAllExpenses };
