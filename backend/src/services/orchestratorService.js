import mongoose              from "mongoose";
import Expense               from "../models/Expense.js";
import { runOrchestrator }  from "../agents/orchestratorAgent.js";
import ApiError             from "../utils/ApiError.js";

// ─── In-Memory TTL Cache ──────────────────────────────────────────────────────
// 60-minute TTL — the full pipeline is expensive (up to 5 Gemini calls).
// Cache is busted when expenses are mutated via expenseController.
// Production upgrade path: replace with Redis.

const cache     = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

const getCached  = (key)       => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCached  = (key, data) => cache.set(key, { data, timestamp: Date.now() });
const bustCache  = (key)       => cache.delete(key);

// ─── MongoDB Data Pipeline ────────────────────────────────────────────────────

/**
 * Builds the unified spending context that the orchestrator passes to
 * stages 2–4. This is a superset of all individual service pipelines,
 * run in a single set of parallel queries to avoid redundant DB round-trips.
 *
 * Includes:
 *  - Overall totals (totalSpent, count, avg, max, min)
 *  - Per-category breakdown with percentages
 *  - Monthly breakdown with per-category detail (for pattern + budget agents)
 *  - Frequent/recurring expenses (for savings + budget agents)
 *  - Recent 30 expenses (for unnecessary spend detection)
 *
 * @param {string} userId
 * @param {number} [months=6]
 * @returns {Promise<Object>}
 */
const buildOrchestratorContext = async (userId, months = 6) => {
  const userObjId  = new mongoose.Types.ObjectId(userId);
  const now        = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [
    totalsResult,
    categoryBreakdown,
    monthlyBreakdown,
    frequentExpenses,
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

    // ── 2. Per-category breakdown ──────────────────────────────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:   "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avg:   { $avg: "$amount" },
          max:   { $max: "$amount" },
          min:   { $min: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id:        0,
          category:   "$_id",
          total:      { $round: ["$total", 2] },
          count:      1,
          avg:        { $round: ["$avg", 2] },
          max:        { $round: ["$max", 2] },
          min:        { $round: ["$min", 2] },
          monthlyAvg: { $round: [{ $divide: ["$total", months] }, 2] },
          // Volatility proxy: (max - min) / avg
          volatility: {
            $cond: [
              { $gt: ["$avg", 0] },
              { $round: [{ $divide: [{ $subtract: ["$max", "$min"] }, "$avg"] }, 2] },
              0,
            ],
          },
        },
      },
    ]),

    // ── 3. Monthly breakdown with per-category detail ──────────────────────
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
          _id: { year: "$_id.year", month: "$_id.month" },
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

    // ── 4. Frequent / recurring expenses ──────────────────────────────────
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
      { $limit: 20 },
      {
        $project: {
          _id:             0,
          title:           1,
          category:        1,
          count:           1,
          total:           { $round: ["$total", 2] },
          avg:             { $round: ["$avg", 2] },
          monthlyEstimate: { $round: [{ $divide: ["$total", months] }, 2] },
          firstSeen:       { $min: "$dates" },
          lastSeen:        { $max: "$dates" },
        },
      },
    ]),

    // ── 5. Recent 30 expenses for unnecessary spend detection ──────────────
    Expense.find({ user: userObjId })
      .sort({ date: -1 })
      .limit(30)
      .select("title amount category date notes")
      .lean(),
  ]);

  const totals     = totalsResult[0] || {};
  const totalSpent = Math.round((totals.totalSpent || 0) * 100) / 100;

  // Enrich category breakdown with percentage share
  const categoriesWithPct = categoryBreakdown.map((c) => ({
    ...c,
    percentage: totalSpent > 0
      ? Math.round((c.total / totalSpent) * 1000) / 10
      : 0,
  }));

  return {
    analysisRange: {
      from:   rangeStart.toISOString().split("T")[0],
      to:     now.toISOString().split("T")[0],
      months,
    },
    totals: {
      totalSpent,
      count:     totals.count     || 0,
      avgAmount: Math.round((totals.avgAmount || 0) * 100) / 100,
      maxAmount: Math.round((totals.maxAmount || 0) * 100) / 100,
      minAmount: Math.round((totals.minAmount || 0) * 100) / 100,
    },
    totalCount:        totals.count || 0,
    categoryBreakdown: categoriesWithPct,
    monthlyBreakdown,
    frequentExpenses,
    recentExpenses: recentExpenses.map((e) => ({
      title:    e.title,
      amount:   e.amount,
      category: e.category,
      date:     e.date?.toISOString().split("T")[0],
      notes:    e.notes || "",
    })),
  };
};

// ─── Service Function ─────────────────────────────────────────────────────────

/**
 * Runs the full AI orchestration pipeline for a user.
 *
 * Flow:
 *  1. Check cache — return cached result if valid and not force-refreshed
 *  2. Build unified spending context from MongoDB (single set of parallel queries)
 *  3. Validate minimum data requirements
 *  4. Run orchestratorAgent pipeline (5 stages)
 *  5. Cache and return result
 *
 * @param {string}  userId
 * @param {Array}   [expenses=[]]      - Raw expenses for stage 1 categorization
 * @param {number}  [months=6]         - History window for context building
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Object>} Full pipeline result
 */
const runFullAnalysis = async (userId, expenses = [], months = 6, forceRefresh = false) => {
  const cacheKey = `orchestrator:${userId}:${months}`;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[OrchestratorService] Cache hit for user ${userId}`);
      return { ...cached, fromCache: true };
    }
  }

  // Build the unified context — single DB round-trip for all stages
  const spendingContext = await buildOrchestratorContext(userId, months);

  // Require at least 1 expense to run meaningful analysis
  if (spendingContext.totalCount === 0 && (!expenses || expenses.length === 0)) {
    throw ApiError.badRequest(
      "No expense data found. Add at least a few expenses before running the full analysis pipeline."
    );
  }

  // Run the full pipeline
  const result = await runOrchestrator(expenses, spendingContext, userId);

  // Attach service-level meta
  const finalResult = {
    ...result,
    meta: {
      ...result.meta,
      analysisRange: spendingContext.analysisRange,
      fromCache:     false,
    },
  };

  setCached(cacheKey, finalResult);
  return finalResult;
};

/**
 * Invalidates the orchestrator cache for a user.
 * Called after any expense mutation.
 *
 * @param {string} userId
 */
const invalidateOrchestratorCache = (userId) => {
  [3, 6, 12].forEach((m) => bustCache(`orchestrator:${userId}:${m}`));
  console.log(`[OrchestratorService] Cache invalidated for user ${userId}`);
};

export { runFullAnalysis, invalidateOrchestratorCache };
