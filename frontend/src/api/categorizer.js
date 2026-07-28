import api from "./axiosInstance";

/**
 * Suggests a category for a single transaction title/description.
 * Maps to POST /api/v1/categorizer/suggest
 */
export const suggestCategory = (data) =>
  api.post("/categorizer/suggest", data);

/**
 * Suggests categories for a batch of transactions.
 * Maps to POST /api/v1/categorizer/suggest/batch
 */
export const suggestBatch = (expenses) =>
  api.post("/categorizer/suggest/batch", { expenses });

/**
 * Applies AI categorization to a single expense.
 * Maps to PATCH /api/v1/categorizer/apply/:expenseId
 */
export const applyToExpense = (expenseId) =>
  api.patch(`/categorizer/apply/${expenseId}`);

/**
 * Applies AI categorization to all uncategorized expenses.
 * Maps to POST /api/v1/categorizer/apply/all
 */
export const applyToAllExpenses = () =>
  api.post("/categorizer/apply/all");
