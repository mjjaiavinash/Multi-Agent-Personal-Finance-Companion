import mongoose              from "mongoose";
import Expense               from "../models/Expense.js";
import User                  from "../models/User.js";
import { generateBudgetPlan } from "../agents/budgetPlannerAgent.js";
import ApiError              from "../utils/ApiError.js";

// ─── In-Memory TTL Cache ──────────────────────────────────────────────────────
// 45-minute TTL — budget plans are stable within a session but should refresh
// after new expenses are added.

const cache     = new Map();
const CACHE_TTL = 45 * 60 * 1000; // 45 minutes

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
 * Runs 4 parallel aggregation pipelines to build a rich spending context
 * specifically designed for budget planning.
 *
 * @param {string} userId
 * @param {number} months - History window (default 3 for tighter budget accuracy)
 * @returns {Promise<Object>} Structured context for the AI prompt
 */
const buildBudgetContext = async (userId, months = 3) => {
  const rawId = userId?._id || userId?.id || userId;
  const userObjId = mongoose.Types.ObjectId.isValid(rawId)
    ? new mongoose.Types.ObjectId(String(rawId))
    : rawId;

  const now        = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // Fetch User record for income & budget targets
  const userDoc = await User.findById(rawId).lean().catch(() => null);
  const profileIncome = userDoc?.monthlyIncome || 0;
  const profileBudget = userDoc?.monthlyBudget || 0;

  const [
    totalsResult,
    categoryStats,
    monthlyBreakdown,
    recurringCosts,
  ] = await Promise.all([

    // ── 1. Overall totals for the analysis window ──────────────────────────
    Expense.aggregate([
      { $match: { user: { $in: [userObjId, String(rawId), String(userObjId)] }, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:        null,
          totalSpent: { $sum: "$amount" },
          count:      { $sum: 1 },
          maxSingle:  { $max: "$amount" },
        },
      },
    ]),

    // ── 2. Category totals & volatility ───────────────────────────────────
    Expense.aggregate([
      { $match: { user: { $in: [userObjId, String(rawId), String(userObjId)] }, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:     "$category",
          total:   { $sum: "$amount" },
          count:   { $sum: 1 },
          avg:     { $avg: "$amount" },
          max:     { $max: "$amount" },
          min:     { $min: "$amount" },
          amounts: { $push: "$amount" },
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
          min:      { $round: ["$min", 2] },
          monthlyAvg: { $round: [{ $divide: ["$total", months] }, 2] },
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

    // ── 3. Month-by-month totals (for trend + forecast) ────────────────────
    Expense.aggregate([
      { $match: { user: { $in: [userObjId, String(rawId), String(userObjId)] }, date: { $gte: rangeStart } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
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
          total: { $round: ["$total", 2] },
          count: 1,
        },
      },
    ]),

    // ── 4. Recurring / fixed costs (budget floor) ──────────────────────────
    Expense.aggregate([
      { $match: { user: { $in: [userObjId, String(rawId), String(userObjId)] }, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:      { $toLower: { $trim: { input: "$title" } } },
          title:    { $first: "$title" },
          category: { $first: "$category" },
          count:    { $sum: 1 },
          total:    { $sum: "$amount" },
          avg:      { $avg: "$amount" },
        },
      },
      { $match: { count: { $gte: Math.max(2, Math.floor(months * 0.6)) } } },
      { $sort: { total: -1 } },
      { $limit: 25 },
      {
        $project: {
          _id:             0,
          title:           1,
          category:        1,
          count:           1,
          total:           { $round: ["$total", 2] },
          avg:             { $round: ["$avg", 2] },
          monthlyEstimate: { $round: [{ $divide: ["$total", months] }, 2] },
        },
      },
    ]),
  ]);

  const totals = totalsResult[0] || {};

  const totalSpent  = Math.round((totals.totalSpent || 0) * 100) / 100;
  const monthlyAvg  = months > 0 ? Math.round((totalSpent / months) * 100) / 100 : 0;

  // Enrich category stats with percentage share
  const categoriesWithPct = categoryStats.map((c) => ({
    ...c,
    percentage: totalSpent > 0
      ? Math.round((c.total / totalSpent) * 1000) / 10
      : 0,
  }));

  // Compute month-over-month trend signal
  const lastMonthTotal = monthlyBreakdown[monthlyBreakdown.length - 1]?.total || 0;
  const priorMonths    = monthlyBreakdown.slice(0, -1);
  const priorAvg       = priorMonths.length > 0
    ? Math.round((priorMonths.reduce((s, m) => s + m.total, 0) / priorMonths.length) * 100) / 100
    : 0;
  const trendPercent   = priorAvg > 0
    ? Math.round(((lastMonthTotal - priorAvg) / priorAvg) * 1000) / 10
    : 0;

  // Fixed cost floor per category (sum of recurring items per category)
  const fixedCostByCategory = recurringCosts.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.monthlyEstimate;
    return acc;
  }, {});

  return {
    analysisRange: {
      from:   rangeStart.toISOString().split("T")[0],
      to:     now.toISOString().split("T")[0],
      months,
    },
    spendingSummary: {
      monthlyIncome:    profileIncome > 0 ? profileIncome : (monthlyAvg > 0 ? Math.round(monthlyAvg / 0.75) : 0),
      monthlyBudget:    profileBudget,
      totalSpent,
      transactionCount: totals.count || 0,
      monthlyAverage:   monthlyAvg,
      largestSingle:    Math.round((totals.maxSingle || 0) * 100) / 100,
      lastMonthSpend:   lastMonthTotal,
      trendVsPrior:     trendPercent,
    },
    categoryBreakdown:    categoriesWithPct,
    monthlyBreakdown,
    recurringCosts,
    fixedCostByCategory,
    totalCount:           totals.count || 0,
  };
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Generates a complete monthly budget plan for a user.
 *
 * Uses a 45-minute TTL cache to avoid redundant Gemini calls.
 * Cache is busted automatically when expenses are created, updated, or deleted.
 *
 * @param {string}  userId
 * @param {number}  [months=3]           - History window (1–6)
 * @param {boolean} [forceRefresh=false] - Bypass cache
 * @returns {Promise<Object>} Full budget plan
 */
const getBudgetPlan = async (userId, months = 3, forceRefresh = false, overrideIncome = 0) => {
  if (overrideIncome > 0) {
    const rawId = userId?._id || userId?.id || userId;
    await User.findByIdAndUpdate(rawId, { monthlyIncome: overrideIncome }).catch(() => {});
    forceRefresh = true;
  }

  const cacheKey = `budget:${userId}:${months}`;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[BudgetPlannerService] Cache hit for user ${userId}`);
      return { ...cached, fromCache: true };
    }
  }

  const context = await buildBudgetContext(userId, months);

  if (context.totalCount === 0) {
    throw ApiError.badRequest(
      "No expense data found. Add at least a few expenses before generating a budget plan."
    );
  }

  const plan = await generateBudgetPlan(context);

  const result = {
    ...plan,
    meta: {
      analysisRange:  context.analysisRange,
      totalExpenses:  context.totalCount,
      monthlyAverage: context.spendingSummary.monthlyAverage,
      generatedAt:    new Date().toISOString(),
      fromCache:      false,
    },
  };

  setCached(cacheKey, result);
  return result;
};

/**
 * Invalidates all cached budget plans for a user.
 * Called automatically after any expense create, update, or delete.
 *
 * @param {string} userId
 */
const invalidateBudgetCache = (userId) => {
  [1, 2, 3, 6].forEach((m) => bustCache(`budget:${userId}:${m}`));
  console.log(`[BudgetPlannerService] Cache invalidated for user ${userId}`);
};

export { getBudgetPlan, invalidateBudgetCache };
