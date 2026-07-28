import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { createNotification } from "./notificationService.js";

// ─── Escape special regex chars to prevent ReDoS / SyntaxError ───────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Create ───────────────────────────────────────────────────────────────────
const createExpense = async (userId, { title, amount, category, date, notes }) => {
  const expDate = date ? new Date(date) : new Date();

  // 1. Check for Duplicate Expense on same date with same title & amount
  const startOfDay = new Date(expDate); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(expDate); endOfDay.setHours(23, 59, 59, 999);

  const duplicate = await Expense.findOne({
    user: userId,
    title: { $regex: `^${escapeRegex(title.trim())}$`, $options: "i" },
    amount: Number(amount),
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  const expense = await Expense.create({
    user: userId,
    title,
    amount: Number(amount),
    category,
    date: expDate,
    notes: notes || "",
  });

  // Async notification checks
  try {
    // Duplicate Alert
    if (duplicate) {
      await createNotification(userId, {
        type: "duplicate_expense",
        title: "Duplicate Expense Detected",
        message: `Possible duplicate: "${title}" (₹${amount}) was recorded today.`,
        severity: "warning",
        metadata: { expenseId: expense._id },
      });
    }

    // Large Expense Alert (> ₹5,000 threshold)
    if (Number(amount) >= 5000) {
      await createNotification(userId, {
        type: "large_expense",
        title: "Large Expense Added",
        message: `High value transaction added: "${title}" for ₹${Number(amount).toLocaleString()}.`,
        severity: "info",
        metadata: { expenseId: expense._id, amount },
      });
    }

    // Budget Adherence Checks
    const user = await User.findById(userId).lean();
    const monthlyBudget = user?.monthlyBudget || 2500;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthAgg = await Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, totalSpent: { $sum: "$amount" } } },
    ]);

    const totalSpent = monthAgg[0]?.totalSpent || 0;

    if (totalSpent >= monthlyBudget) {
      await createNotification(userId, {
        type: "budget_exceeded",
        title: "Budget Exceeded!",
        message: `Your monthly spend (₹${totalSpent.toLocaleString()}) has exceeded your target budget of ₹${monthlyBudget.toLocaleString()}.`,
        severity: "error",
        metadata: { totalSpent, monthlyBudget },
      });
    } else if (totalSpent >= monthlyBudget * 0.8) {
      await createNotification(userId, {
        type: "budget_80",
        title: "Budget Warning (80% Reached)",
        message: `You have spent ₹${totalSpent.toLocaleString()} (${Math.round((totalSpent / monthlyBudget) * 100)}%) of your ₹${monthlyBudget.toLocaleString()} monthly budget.`,
        severity: "warning",
        metadata: { totalSpent, monthlyBudget },
      });
    }
  } catch (err) {
    console.error("[ExpenseService] Failed to trigger notification:", err.message);
  }

  return expense;
};

// ─── Get All (paginated + filtered + searched) ────────────────────────────────
const getExpenses = async (userId, query) => {
  const {
    page     = 1,
    limit    = 10,
    search   = "",
    category = "",
    startDate,
    endDate,
    sort     = "-date",
  } = query;

  const pageNum  = Math.max(parseInt(page,  10), 1);
  const limitNum = Math.min(parseInt(limit, 10), 50); // cap at 50 per page
  const skip     = (pageNum - 1) * limitNum;

  // ── Build filter ────────────────────────────────────────────────────────────
  const filter = { user: userId };

  if (search.trim()) {
    filter.title = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  if (category) {
    filter.category = category;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  // ── Sanitize sort field ─────────────────────────────────────────────────────
  const allowedSorts = ["date", "-date", "amount", "-amount", "title", "-title", "createdAt", "-createdAt"];
  const sortField    = allowedSorts.includes(sort) ? sort : "-date";

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort(sortField)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return {
    expenses,
    pagination: {
      total,
      page:       pageNum,
      limit:      limitNum,
      totalPages: Math.ceil(total / limitNum),
      hasNext:    pageNum < Math.ceil(total / limitNum),
      hasPrev:    pageNum > 1,
    },
  };
};

// ─── Get Single ───────────────────────────────────────────────────────────────
const getExpenseById = async (userId, expenseId) => {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw ApiError.badRequest("Invalid expense ID.");
  }

  const expense = await Expense.findOne({ _id: expenseId, user: userId });
  if (!expense) throw ApiError.notFound("Expense not found.");
  return expense;
};

// ─── Update ───────────────────────────────────────────────────────────────────
const updateExpense = async (userId, expenseId, updates) => {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw ApiError.badRequest("Invalid expense ID.");
  }

  const expense = await Expense.findOne({ _id: expenseId, user: userId });
  if (!expense) throw ApiError.notFound("Expense not found.");

  const allowed = ["title", "amount", "category", "date", "notes"];
  allowed.forEach((field) => {
    if (updates[field] !== undefined) {
      expense[field] = field === "date" ? new Date(updates[field]) : updates[field];
    }
  });

  await expense.save();
  return expense;
};

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteExpense = async (userId, expenseId) => {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw ApiError.badRequest("Invalid expense ID.");
  }

  const expense = await Expense.findOneAndDelete({ _id: expenseId, user: userId });
  if (!expense) throw ApiError.notFound("Expense not found.");
  return expense;
};

// ─── Summary (for dashboard + AI) ────────────────────────────────────────────
const getExpenseSummary = async (userId) => {
  return Expense.getSummary(userId);
};

export {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
