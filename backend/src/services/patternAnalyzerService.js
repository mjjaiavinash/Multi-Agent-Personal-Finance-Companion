import mongoose                              from "mongoose";
import Expense                               from "../models/Expense.js";
import { analyzePatterns, analyzeDimension } from "../agents/patternAnalyzerAgent.js";
import ApiError                              from "../utils/ApiError.js";

// ─── In-Memory TTL Cache ──────────────────────────────────────────────────────
// Prevents hammering Gemini on repeated dashboard loads.
// Production upgrade: replace with Redis using userId as key.

const cache     = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const getCached  = (key)        => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCached  = (key, data)  => cache.set(key, { data, timestamp: Date.now() });
const bustCache  = (key)        => cache.delete(key);

// ─── MongoDB Data Pipeline ────────────────────────────────────────────────────

/**
 * Runs 5 parallel aggregation pipelines to build a rich spending context
 * object that is injected into the Gemini prompt.
 *
 * @param {string} userId
 * @param {number} [months=6] - How many months of history to include
 * @returns {Promise<Object>} Structured context for the AI prompt
 */
const buildSpendingContext = async (userId, months = 6) => {
  const userObjId  = new mongoose.Types.ObjectId(userId);
  const now        = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [
    totalsResult,
    categoryBreakdown,
    monthlyBreakdown,
    frequencyData,
    recentExpenses,
  ] = await Promise.all([

    // ── 1. Overall totals ──────────────────────────────────────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:        null,
          totalSpent: { $sum: "$amount" },
          count:      { $sum: 1 },
          avgAmount:  { $avg: "$amount" },
          maxAmount:  { $max: "$amount" },
          minAmount:  { $min: "$amount" },
        },
      },
    ]),

    // ── 2. Spending by category with month-over-month delta ────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:   "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avg:   { $avg: "$amount" },
          max:   { $max: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id:      0,
          category: "$_id",
          total:    { $round: ["$total", 2] },
          count:    1,
          avg:      { $round: ["$avg", 2] },
          max:      { $round: ["$max", 2] },
        },
      },
    ]),

    // ── 3. Monthly totals per category (for trend analysis) ────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id: {
            year:     { $year:  "$date" },
            month:    { $month: "$date" },
            category: "$category",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $group: {
          _id: {
            year:  "$_id.year",
            month: "$_id.month",
          },
          totalSpent:  { $sum: "$total" },
          categories:  {
            $push: {
              category: "$_id.category",
              total:    { $round: ["$total", 2] },
              count:    "$count",
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id:   0,
          month: {
            $dateToString: {
              format: "%b %Y",
              date: {
                $dateFromParts: {
                  year:  "$_id.year",
                  month: "$_id.month",
                  day:   1,
                },
              },
            },
          },
          totalSpent:  { $round: ["$totalSpent", 2] },
          categories:  1,
        },
      },
    ]),

    // ── 4. Frequent expense patterns (title frequency) ─────────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:      { $toLower: { $trim: { input: "$title" } } },
          title:    { $first: "$title" },
          category: { $first: "$category" },
          count:    { $sum: 1 },
          total:    { $sum: "$amount" },
          avg:      { $avg: "$amount" },
          dates:    { $push: "$date" },
        },
      },
      { $match: { count: { $gte: 2 } } },
      { $sort: { count: -1, total: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id:      0,
          title:    1,
          category: 1,
          count:    1,
          total:    { $round: ["$total", 2] },
          avg:      { $round: ["$avg", 2] },
          firstSeen: { $min: "$dates" },
          lastSeen:  { $max: "$dates" },
        },
      },
    ]),

    // ── 5. Recent 30 expenses for unnecessary spend detection ─────────────
    Expense.find({ user: userObjId })
      .sort({ date: -1 })
      .limit(30)
      .select("title amount category date notes")
      .lean(),
  ]);

  const totals = totalsResult[0] || {};

  // Compute percentage share per category
  const categoriesWithPct = categoryBreakdown.map((c) => ({
    ...c,
    percentage: totals.totalSpent > 0
      ? Math.round((c.total / totals.totalSpent) * 1000) / 10
      : 0,
  }));

  return {
    analysisRange: {
      from:   rangeStart.toISOString().split("T")[0],
      to:     now.toISOString().split("T")[0],
      months,
    },
    totals: {
      totalSpent: Math.round((totals.totalSpent || 0) * 100) / 100,
      count:      totals.count      || 0,
      avgAmount:  Math.round((totals.avgAmount  || 0) * 100) / 100,
      maxAmount:  Math.round((totals.maxAmount  || 0) * 100) / 100,
      minAmount:  Math.round((totals.minAmount  || 0) * 100) / 100,
    },
    totalCount:         totals.count || 0,
    categoryBreakdown:  categoriesWithPct,
    monthlyBreakdown,
    frequentExpenses:   frequencyData,
    recentExpenses:     recentExpenses.map((e) => ({
      title:    e.title,
      amount:   e.amount,
      category: e.category,
      date:     e.date?.toISOString().split("T")[0],
      notes:    e.notes || "",
    })),
  };
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Full pattern analysis — uses cache, builds context, calls agent.
 *
 * @param {string} userId
 * @param {number} [months=6]
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Object>}
 */
const getPatternAnalysis = async (userId, months = 6, forceRefresh = false) => {
  const cacheKey = `pattern:${userId}:${months}`;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[PatternAnalyzerService] Cache hit for user ${userId}`);
      return { ...cached, fromCache: true };
    }
  }

  const context = await buildSpendingContext(userId, months);

  if (context.totalCount === 0) {
    throw ApiError.badRequest(
      "No expense data found. Add some expenses before running pattern analysis."
    );
  }

  const analysis = await analyzePatterns(context);

  const result = {
    ...analysis,
    meta: {
      analysisRange:  context.analysisRange,
      totalExpenses:  context.totalCount,
      generatedAt:    new Date().toISOString(),
      fromCache:      false,
    },
  };

  setCached(cacheKey, result);
  return result;
};

/**
 * Single dimension analysis — always fresh (no cache).
 *
 * @param {string} userId
 * @param {string} dimension
 * @param {number} [months=6]
 * @returns {Promise<Object>}
 */
const getDimensionAnalysis = async (userId, dimension, months = 6) => {
  const context = await buildSpendingContext(userId, months);

  if (context.totalCount === 0) {
    throw ApiError.badRequest("No expense data found for analysis.");
  }

  return analyzeDimension(context, dimension);
};

/**
 * Invalidates the cached analysis for a user.
 * Should be called after new expenses are added/deleted.
 *
 * @param {string} userId
 */
const invalidateCache = (userId) => {
  [3, 6, 12].forEach((m) => bustCache(`pattern:${userId}:${m}`));
  console.log(`[PatternAnalyzerService] Cache invalidated for user ${userId}`);
};

export { getPatternAnalysis, getDimensionAnalysis, invalidateCache };
