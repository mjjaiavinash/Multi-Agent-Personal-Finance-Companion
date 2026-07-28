import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import { predictSpending } from "../agents/predictionAgent.js";
import ApiError from "../utils/ApiError.js";
import { createNotification } from "./notificationService.js";

// ─── In-memory LRU-capped prediction cache (max 100 entries, 15min TTL) ──────
const cache    = new Map();
const CACHE_TTL = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};

const setCached = (key, data) => {
  // Evict oldest entry if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
};

export const getSpendingPredictions = async (userId, months = 6, forceRefresh = false) => {
  const cacheKey = `prediction:${userId}:${months}`;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }

  const userObjId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userId).lean();
  const monthlyIncome = user?.monthlyIncome || 0;
  const monthlyBudget = user?.monthlyBudget || 0;

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // Parallel aggregations
  const [
    totalsAgg,
    categoryAgg,
    weeklyAgg,
    dailyPatternAgg
  ] = await Promise.all([
    // Total expenses & count
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      { $group: { _id: null, totalSpent: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } }
    ]),

    // Category breakdown
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
      { $sort: { total: -1 } }
    ]),

    // Weekly grouping (past 4 weeks)
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { week: { $isoWeek: "$date" }, year: { $isoWeekYear: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ]),

    // Day of week pattern
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id: { dow: { $dayOfWeek: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.dow": 1 } }
    ])
  ]);

  const totalSpent = totalsAgg[0]?.totalSpent || 0;
  const totalTransactions = totalsAgg[0]?.count || 0;

  if (totalTransactions === 0) {
    throw ApiError.badRequest("No historical expense data found. Add expenses to generate AI predictions.");
  }

  // Calculate baseline averages
  const weeksCount = Math.max(1, Math.round(months * 4.33));
  const avgWeeklySpend = Math.round((totalSpent / weeksCount) * 100) / 100;
  const avgMonthlySpend = Math.round((totalSpent / Math.max(1, months)) * 100) / 100;

  const categoryData = categoryAgg.map((c) => ({
    category: c._id || "General",
    total: Math.round(c.total * 100) / 100,
    count: c.count,
    weeklyAvg: Math.round((c.total / weeksCount) * 100) / 100
  }));

  const past4Weeks = weeklyAgg.map((w, idx) => ({
    weekLabel: `Week ${idx + 1}`,
    total: Math.round(w.total * 100) / 100,
    count: w.count
  }));

  // Standardize past4Weeks to exactly 4 items without mutating during iteration
  const missingWeeks = 4 - past4Weeks.length;
  const fillerWeeks  = Array.from({ length: missingWeeks }, (_, i) => ({
    weekLabel: `Week ${i + 1}`,
    total:     avgWeeklySpend,
    count:     Math.round(totalTransactions / weeksCount),
  }));
  const normalizedWeeks = [...fillerWeeks, ...past4Weeks].map((w, i) => ({
    ...w,
    weekLabel: `Week ${i + 1}`,
  }));

  const DOW_NAMES = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyPattern = dailyPatternAgg.map((d) => ({
    day: DOW_NAMES[d._id.dow] || "Day",
    avgSpend: Math.round((d.total / (d.count || 1)) * 100) / 100
  }));

  // Build context
  const context = {
    months,
    historyStartDate: rangeStart.toISOString().split("T")[0],
    historyEndDate: now.toISOString().split("T")[0],
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalTransactions,
    avgWeeklySpend,
    avgMonthlySpend,
    monthlyIncome,
    monthlyBudget,
    categoryData,
    past4Weeks:  normalizedWeeks,
    dailyPattern
  };

  // Run AI prediction agent
  const prediction = await predictSpending(context);

  // Calculate confidence score dynamically based on transaction volume & history span
  let confidence = 65;
  if (totalTransactions >= 10) confidence += 10;
  if (totalTransactions >= 30) confidence += 10;
  if (months >= 3) confidence += 5;
  if (months >= 6) confidence += 5;
  confidence = Math.min(95, Math.max(50, confidence));

  const result = {
    ...prediction,
    confidenceScore: prediction.confidenceScore || confidence,
    meta: {
      totalTransactionsAnalyzed: totalTransactions,
      historyMonths: months,
      generatedAt: new Date().toISOString(),
      fromCache: false
    }
  };

  setCached(cacheKey, result);

  // Fire prediction_changed notification only on forced refresh
  if (forceRefresh) {
    createNotification(userId, {
      type: "prediction_changed",
      title: "AI Predictions Updated 🤖",
      message: `New spending predictions computed. Next month forecast: ₹${(result.nextMonthExpense?.predictedAmount || 0).toLocaleString()} with ${result.confidenceScore || confidence}% confidence.`,
      severity: "info",
      metadata: { confidenceScore: result.confidenceScore || confidence },
    }).catch(() => {});
  }

  return result;
};
