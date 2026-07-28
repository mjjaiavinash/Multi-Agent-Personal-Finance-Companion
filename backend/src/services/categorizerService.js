import { categorizeOne, categorizeBatch } from "../agents/categorizerAgent.js";
import Expense, { CATEGORIES }           from "../models/Expense.js";
import ApiError                          from "../utils/ApiError.js";

/**
 * Maps the agent's simplified category labels to the Expense model's
 * full category strings. Falls back to "Other" for unknown mappings.
 */
const AGENT_TO_MODEL_CATEGORY = {
  "Food":          "Food & Dining",
  "Shopping":      "Shopping",
  "Transport":     "Transportation",
  "Medical":       "Health & Fitness",
  "Bills":         "Bills & Utilities",
  "Entertainment": "Entertainment",
  "Education":     "Education",
  "Other":         "Other",
};

const toModelCategory = (agentCategory) =>
  AGENT_TO_MODEL_CATEGORY[agentCategory] || "Other";

// ─── Categorize a single expense input (no DB write) ─────────────────────────

/**
 * Suggests a category for a given expense title/amount/notes.
 * Does NOT write to the database — pure suggestion.
 *
 * @returns {{ category: string, modelCategory: string, confidence: number, reasoning: string }}
 */
const suggestCategory = async ({ title, amount, notes }) => {
  const result = await categorizeOne({ title, amount, notes });
  return {
    ...result,
    modelCategory: toModelCategory(result.category),
  };
};

// ─── Categorize a batch of expense inputs (no DB write) ──────────────────────

/**
 * Suggests categories for multiple expense inputs.
 * Does NOT write to the database.
 *
 * @param {Array<{ id: string, title: string, amount: number, notes?: string }>} expenses
 * @returns {Promise<Array>}
 */
const suggestBatch = async (expenses) => {
  const results = await categorizeBatch(expenses);
  return results.map((r) => ({
    ...r,
    modelCategory: toModelCategory(r.category),
  }));
};

// ─── Auto-apply: re-categorize a user's existing expense in DB ────────────────

/**
 * Runs the categorizer on an existing expense document and saves the result.
 * Only updates if the new confidence is above the threshold.
 *
 * @param {string} userId
 * @param {string} expenseId
 * @param {number} [confidenceThreshold=0.70]
 * @returns {{ expense: Object, result: Object, updated: boolean }}
 */
const applyToExpense = async (userId, expenseId, confidenceThreshold = 0.70) => {
  const expense = await Expense.findOne({ _id: expenseId, user: userId });
  if (!expense) throw ApiError.notFound("Expense not found.");

  const result = await categorizeOne({
    title:  expense.title,
    amount: expense.amount,
    notes:  expense.notes,
  });

  const modelCategory = toModelCategory(result.category);
  const updated       = result.confidence >= confidenceThreshold && !result.fallback;

  if (updated) {
    expense.category = modelCategory;
    await expense.save();
  }

  return {
    expense: expense.toObject(),
    result:  { ...result, modelCategory },
    updated,
    skippedReason: !updated
      ? `Confidence ${result.confidence.toFixed(2)} below threshold ${confidenceThreshold}`
      : null,
  };
};

// ─── Auto-apply: bulk re-categorize all of a user's expenses ─────────────────

/**
 * Fetches all of a user's expenses, runs batch categorization,
 * and bulk-writes the results back to MongoDB.
 *
 * @param {string} userId
 * @param {number} [confidenceThreshold=0.70]
 * @returns {{ processed: number, updated: number, skipped: number, results: Array }}
 */
const applyToAllExpenses = async (userId, confidenceThreshold = 0.70) => {
  const expenses = await Expense.find({ user: userId }).lean();
  if (expenses.length === 0) {
    return { processed: 0, updated: 0, skipped: 0, results: [] };
  }

  // Batch in chunks of 20 (agent limit)
  const CHUNK_SIZE = 20;
  const allResults = [];

  for (let i = 0; i < expenses.length; i += CHUNK_SIZE) {
    const chunk = expenses.slice(i, i + CHUNK_SIZE).map((e) => ({
      id:     e._id.toString(),
      title:  e.title,
      amount: e.amount,
      notes:  e.notes || "",
    }));

    const chunkResults = await categorizeBatch(chunk);
    allResults.push(...chunkResults);
  }

  // Build bulk write operations for high-confidence results
  const bulkOps = [];
  let updated = 0;
  let skipped = 0;

  const resultsWithMeta = allResults.map((r) => {
    const modelCategory = toModelCategory(r.category);
    const shouldUpdate  = r.confidence >= confidenceThreshold && !r.fallback;

    if (shouldUpdate) {
      bulkOps.push({
        updateOne: {
          filter: { _id: r.id, user: userId },
          update: { $set: { category: modelCategory } },
        },
      });
      updated++;
    } else {
      skipped++;
    }

    return { ...r, modelCategory, updated: shouldUpdate };
  });

  if (bulkOps.length > 0) {
    await Expense.bulkWrite(bulkOps, { ordered: false });
  }

  return {
    processed: expenses.length,
    updated,
    skipped,
    results: resultsWithMeta,
  };
};

export { suggestCategory, suggestBatch, applyToExpense, applyToAllExpenses };
