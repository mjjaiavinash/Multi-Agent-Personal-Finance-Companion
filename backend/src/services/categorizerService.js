import { categorizeOne, categorizeBatch } from "../agents/categorizerAgent.js";
import Expense, { CATEGORIES }           from "../models/Expense.js";
import ApiError                          from "../utils/ApiError.js";

/**
 * Maps the agent's simplified category labels to the Expense model's
 * full category strings. Falls back to "Other" for unknown mappings.
 */
const toModelCategory = (agentCategory) => {
  if (!agentCategory) return "Other";
  const validCategories = [
    "Food & Dining", "Shopping", "Transport", "Bills & Utilities",
    "Entertainment", "Education", "Healthcare", "Housing & EMI", "Travel", "Other"
  ];
  if (validCategories.includes(agentCategory)) return agentCategory;
  if (agentCategory.includes("Food")) return "Food & Dining";
  if (agentCategory.includes("Transport") || agentCategory.includes("Taxi")) return "Transport";
  if (agentCategory.includes("Bill") || agentCategory.includes("Utility")) return "Bills & Utilities";
  if (agentCategory.includes("Medical") || agentCategory.includes("Health")) return "Healthcare";
  if (agentCategory.includes("Housing") || agentCategory.includes("Rent") || agentCategory.includes("EMI")) return "Housing & EMI";
  return "Other";
};

// ─── Categorize a single expense input (no DB write) ─────────────────────────

/**
 * Suggests a category for a given expense title/amount/notes.
 * Does NOT write to the database — pure suggestion.
 */
const suggestCategory = async ({ title, amount, notes }) => {
  const result = await categorizeOne({ title, amount, notes });
  return {
    ...result,
    category:      toModelCategory(result.category),
    modelCategory: toModelCategory(result.category),
  };
};

// ─── Categorize a batch of expense inputs (no DB write) ──────────────────────

const suggestBatch = async (expenses) => {
  const results = await categorizeBatch(expenses);
  return results.map((r) => ({
    ...r,
    category:      toModelCategory(r.category),
    modelCategory: toModelCategory(r.category),
  }));
};

// ─── Auto-apply: re-categorize a user's expense in DB ────────────────

const applyToExpense = async (userId, expenseId) => {
  const rawId = userId?._id || userId?.id || userId;
  const userObjId = mongoose.Types.ObjectId.isValid(rawId)
    ? new mongoose.Types.ObjectId(String(rawId))
    : rawId;

  const expense = await Expense.findOne({ _id: expenseId, user: { $in: [userObjId, String(rawId)] } });
  if (!expense) throw ApiError.notFound("Expense not found.");

  const result = await categorizeOne({
    title:  expense.title,
    amount: expense.amount,
    notes:  expense.notes,
  });

  const modelCategory = toModelCategory(result.category);
  expense.category = modelCategory;
  await expense.save();

  return {
    expense: expense.toObject(),
    result:  { ...result, category: modelCategory, modelCategory },
    updated: true,
  };
};

// ─── Auto-apply: bulk re-categorize all of a user's expenses ─────────────────

const applyToAllExpenses = async (userId) => {
  const rawId = userId?._id || userId?.id || userId;
  const userObjId = mongoose.Types.ObjectId.isValid(rawId)
    ? new mongoose.Types.ObjectId(String(rawId))
    : rawId;

  const expenses = await Expense.find({ user: { $in: [userObjId, String(rawId)] } });
  if (!expenses || expenses.length === 0) {
    return { processed: 0, updated: 0, categorizedCount: 0, results: [] };
  }

  let updatedCount = 0;
  const bulkOps = [];

  for (const exp of expenses) {
    const result = await categorizeOne({
      title:  exp.title,
      amount: exp.amount,
      notes:  exp.notes || "",
    });
    const modelCategory = toModelCategory(result.category);
    bulkOps.push({
      updateOne: {
        filter: { _id: exp._id },
        update: { $set: { category: modelCategory } },
      },
    });
    updatedCount++;
  }

  if (bulkOps.length > 0) {
    await Expense.bulkWrite(bulkOps, { ordered: false });
  }

  return {
    processed:        expenses.length,
    updated:          updatedCount,
    categorizedCount: updatedCount,
  };
};

export { suggestCategory, suggestBatch, applyToExpense, applyToAllExpenses };
