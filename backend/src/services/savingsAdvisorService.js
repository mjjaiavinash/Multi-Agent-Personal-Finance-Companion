import mongoose                    from "mongoose";
import Expense                     from "../models/Expense.js";
import { generateSavingsAdvice }   from "../agents/savingsAdvisorAgent.js";
import ApiError                    from "../utils/ApiError.js";

// ─── In-Memory TTL Cache ──────────────────────────────────────────────────────
// 60-minute TTL — savings advice changes less frequently than pattern analysis.
// Production upgrade path: replace with Redis SET key value EX 3600.

const cache     = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCached = (key, data) => cache.set(key, { data, timestamp: Date.now() });
const bustCache = (key)       => cache.delete(key);

// ─── MongoDB Data Pipeline ────────────────────────────────────────────────────

/**
 * Runs 4 parallel aggregation pipelines to build a rich financial context
 * object specifically designed for savings advisory analysis.
 *
 * This pipeline is intentionally separate from patternAnalyzerService's pipeline:
 *  - Different aggregation focus (reduction potential vs. pattern detection)
 *  - Different data shape (advisor needs per-category reduction headroom)
 *  - Avoids coupling two independent agents to the same data contract
 *
 * @param {string} userId
 * @param {number} months - History window for analysis
 * @returns {Promise<Object>} Structured financial context
 */
const buildFinancialContext = async (userId, months = 6) => {
  const userObjId  = new mongoose.Types.ObjectId(userId);
  const now        = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [
    totalsResult,
    categoryAnalysis,
    monthlyTotals,
    subscriptionData,
  ] = await Promise.all([

    // ── 1. Overall financial totals ────────────────────────────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
      {
        $group: {
          _id:          null,
          totalSpent:   { $sum: "$amount" },
          count:        { $sum: 1 },
          avgPerMonth:  { $avg: "$amount" },
          maxSingle:    { $max: "$amount" },
        },
      },
    ]),

    // ── 2. Per-category breakdown with reduction potential signals ─────────
    // Includes: total, count, avg per transaction, max single transaction.
    // The advisor uses avg and max to identify over-spending within categories.
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
          // Collect all amounts to compute variance (spread = impulse purchase signal)
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
          // Monthly average = total / months in range
          monthlyAvg: { $round: [{ $divide: ["$total", months] }, 2] },
        },
      },
    ]),

    // ── 3. Month-by-month totals for trend context ─────────────────────────
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: rangeStart } } },
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

    // ── 4. Subscription / recurring expense detection ──────────────────────
    // Groups by normalized title, finds items appearing monthly (count >= months-1).
    // These are the primary targets for the subscription audit improvement.
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
          // Low variance in amount = likely a fixed subscription
          amounts:  { $push: "$amount" },
        },
      },
      // Recurring = appears at least half as many times as months analyzed
      { $match: { count: { $gte: Math.max(2, Math.floor(months / 2)) } } },
      { $sort: { total: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id:      0,
          title:    1,
          category: 1,
          count:    1,
          total:    { $round: ["$total", 2] },
          avg:      { $round: ["$avg", 2] },
          // Monthly cost estimate
          monthlyEstimate: { $round: [{ $divide: ["$total", months] }, 2] },
        },
      },
    ]),
  ]);

  const totals = totalsResult[0] || {};

  // ── Compute derived financial metrics ─────────────────────────────────────

  const totalSpent    = Math.round((totals.totalSpent || 0) * 100) / 100;
  const monthlyAvg    = months > 0 ? Math.round((totalSpent / months) * 100) / 100 : 0;

  // Compute category percentages relative to total spend
  const categoriesWithPct = categoryAnalysis.map((c) => ({
    ...c,
    percentage: totalSpent > 0
      ? Math.round((c.total / totalSpent) * 1000) / 10
      : 0,
  }));

  // Identify the top 3 categories by spend for focused advisor attention
  const topCategories = categoriesWithPct.slice(0, 3);

  // Monthly trend: compare last month vs. average of prior months
  const lastMonthTotal  = monthlyTotals[monthlyTotals.length - 1]?.total || 0;
  const priorMonths     = monthlyTotals.slice(0, -1);
  const priorAvg        = priorMonths.length > 0
    ? Math.round((priorMonths.reduce((s, m) => s + m.total, 0) / priorMonths.length) * 100) / 100
    : 0;
  const trendVsPrior    = priorAvg > 0
    ? Math.round(((lastMonthTotal - priorAvg) / priorAvg) * 1000) / 10
    : 0;

  return {
    analysisRange: {
      from:   rangeStart.toISOString().split("T")[0],
      to:     now.toISOString().split("T")[0],
      months,
    },
    financialSummary: {
      totalSpent,
      transactionCount: totals.count || 0,
      monthlyAverage:   monthlyAvg,
      largestTransaction: Math.round((totals.maxSingle || 0) * 100) / 100,
      lastMonthSpend:   lastMonthTotal,
      trendVsPriorMonths: trendVsPrior, // positive = spending more than usual
    },
    categoryBreakdown:  categoriesWithPct,
    topSpendingCategories: topCategories,
    monthlyTrend:       monthlyTotals,
    recurringExpenses:  subscriptionData,
    totalCount:         totals.count || 0,
  };
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Generates a full savings advisory report for a user.
 *
 * Uses a 60-minute TTL cache to avoid redundant Gemini calls.
 * Cache is busted when the user adds or deletes expenses.
 *
 * @param {string}  userId
 * @param {number}  [months=6]        - History window (1–12)
 * @param {boolean} [forceRefresh=false] - Bypass cache
 * @returns {Promise<Object>} Full savings advisory result
 */
const getSavingsAdvice = async (userId, months = 6, forceRefresh = false, customIncome = 0) => {
  const userIncome = Number(customIncome) > 0 ? Number(customIncome) : 0;
  const cacheKey = `savings:${userId}:${months}:${userIncome}`;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[SavingsAdvisorService] Cache hit for user ${userId}`);
      return { ...cached, fromCache: true };
    }
  }

  const context = await buildFinancialContext(userId, months);

  if (context.totalCount === 0) {
    throw ApiError.badRequest(
      "No expense data found. Add at least a few expenses before requesting savings advice."
    );
  }

  context.monthlyIncome = userIncome > 0 ? userIncome : (context.financialSummary.monthlyAverage / 0.75);

  const advice = await generateSavingsAdvice(context);

  // Compute precise category overspending alerts based on monthly income
  const categoryAlerts = [];
  const incomeVal = context.monthlyIncome;

  const RECOMMENDED_PCT = {
    "Food & Dining": 0.15,
    "Entertainment": 0.05,
    "Transport":     0.10,
    "Travel":        0.10,
    "Housing & EMI": 0.25,
    "Shopping":      0.07,
    "Bills & Utilities": 0.08,
  };

  context.categoryBreakdown.forEach((cat) => {
    const limitPct = RECOMMENDED_PCT[cat.category] || 0.10;
    const recommendedAmount = Math.round(incomeVal * limitPct);
    const actualMonthly = cat.monthlyAverage || cat.totalAmount;
    const actualPct = Math.round((actualMonthly / incomeVal) * 100);
    const recPctVal = Math.round(limitPct * 100);

    if (actualMonthly > recommendedAmount) {
      const excess = actualMonthly - recommendedAmount;
      categoryAlerts.push({
        category: cat.category,
        actualMonthly,
        recommendedAmount,
        actualPct,
        recommendedPct: recPctVal,
        excess,
        severity: excess > incomeVal * 0.10 ? "high" : "medium",
        message: `High spend detected in ${cat.category}! You are spending ₹${actualMonthly.toLocaleString("en-IN")}/mo (${actualPct}% of your ₹${incomeVal.toLocaleString("en-IN")} income). Recommended cap is ${recPctVal}% (₹${recommendedAmount.toLocaleString("en-IN")}). Reducing this spend frees up ₹${excess.toLocaleString("en-IN")}/month.`,
      });
    }
  });

  const result = {
    ...advice,
    monthlyIncome: incomeVal,
    categoryAlerts,
    meta: {
      analysisRange:  context.analysisRange,
      totalExpenses:  context.totalCount,
      monthlyAverage: context.financialSummary.monthlyAverage,
      monthlyIncome:  incomeVal,
      generatedAt:    new Date().toISOString(),
      fromCache:      false,
    },
  };

  setCached(cacheKey, result);
  return result;
};

/**
 * Invalidates all cached savings advice for a user.
 * Call this after any expense create, update, or delete.
 *
 * @param {string} userId
 */
const invalidateSavingsCache = (userId) => {
  [3, 6, 12].forEach((m) => bustCache(`savings:${userId}:${m}`));
  console.log(`[SavingsAdvisorService] Cache invalidated for user ${userId}`);
};

export { getSavingsAdvice, invalidateSavingsCache };
