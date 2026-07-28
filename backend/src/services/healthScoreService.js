import mongoose                from "mongoose";
import Expense                 from "../models/Expense.js";
import HealthScore             from "../models/HealthScore.js";
import { computeHealthScore }  from "../agents/healthScoreAgent.js";
import ApiError                from "../utils/ApiError.js";

// ─── Aggregation helpers ──────────────────────────────────────────────────────

const buildContext = async (userId, monthlyIncome, monthlyBudget) => {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const now        = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyBreakdown, thisMonthAgg, categoryAgg] = await Promise.all([
    // Last 6 months totals for consistency scoring
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" } } },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),

    // This month total
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // By-category totals (all time for context)
    Expense.aggregate([
      { $match: { user: userObjId } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const monthlyAmounts    = monthlyBreakdown.map((m) => m.total);
  const thisMonthExpenses = thisMonthAgg[0]?.total || 0;
  const byCategory        = categoryAgg.reduce((acc, c) => { acc[c._id] = c.total; return acc; }, {});
  const topCategory       = categoryAgg[0]?._id || "N/A";

  // Simple trend: compare last 2 months
  const last2 = monthlyAmounts.slice(-2);
  const trend = last2.length < 2 ? "stable"
    : last2[1] > last2[0] * 1.1 ? "increasing"
    : last2[1] < last2[0] * 0.9 ? "decreasing"
    : "stable";

  return {
    monthlyIncome,
    thisMonthExpenses,
    monthlyBudget,
    monthlyAmounts,
    byCategory,
    topCategory,
    trend,
    monthsAnalyzed: monthlyBreakdown.length || 1,
    debtRatio: null, // future: pull from user profile
  };
};

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Computes a fresh health score, persists it, and returns it.
 *
 * @param {string} userId
 * @param {number} monthlyIncome
 * @param {number} monthlyBudget
 * @returns {Promise<Object>}
 */
const computeAndSave = async (userId, monthlyIncome, monthlyBudget) => {
  if (!monthlyIncome || monthlyIncome <= 0) {
    throw ApiError.badRequest("Monthly income must be a positive number.");
  }

  const context = await buildContext(userId, monthlyIncome, monthlyBudget);
  const result  = await computeHealthScore(context);

  const saved = await HealthScore.create({ user: userId, ...result });
  return saved.toObject();
};

/**
 * Returns the most recent health score for a user (no recompute).
 *
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getLatest = async (userId) =>
  HealthScore.findOne({ user: userId }).sort({ createdAt: -1 }).lean();

/**
 * Returns the last N score records for history chart.
 *
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getHistory = async (userId, limit = 10) =>
  HealthScore.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("score grade createdAt")
    .lean();

export { computeAndSave, getLatest, getHistory };
