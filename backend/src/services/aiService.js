import mongoose               from "mongoose";
import { processChat }        from "../agents/chatAgent.js";
import { analyzeExpenses }    from "../agents/financeAgent.js";
import { getExpenseSummary }  from "./expenseService.js";
import { getPatternAnalysis } from "./patternAnalyzerService.js";
import Expense                from "../models/Expense.js";
import ApiError               from "../utils/ApiError.js";

// ─── Chat Context Builder ─────────────────────────────────────────────────────

/**
 * Builds an enriched financial context object for the chat agent.
 *
 * Intentionally richer than the basic expense summary:
 *  - Includes monthly trend data so the agent can answer "why did I spend more?"
 *  - Includes recurring expenses so the agent can identify subscription waste
 *  - Includes top categories with monthly averages for affordability calculations
 *
 * Runs 2 parallel queries: the existing summary aggregation + a lightweight
 * supplemental query for recurring expenses and category detail.
 * Gracefully returns an empty object if the user has no data yet.
 *
 * @param {string} userId
 * @returns {Promise<Object>} Enriched context for the chat agent
 */
const buildChatContext = async (userId) => {
  try {
    const userObjId  = new mongoose.Types.ObjectId(userId);
    const now        = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Run summary + supplemental aggregations in parallel
    const [summary, categoryDetail, recurringExpenses] = await Promise.all([

      // ── 1. Core summary (totals, byCategory, monthly bar chart) ───────────
      getExpenseSummary(userId),

      // ── 2. Per-category detail with monthly averages ───────────────────────
      // Gives the agent enough data to answer affordability and trend questions
      Expense.aggregate([
        { $match: { user: userObjId, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id:   "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avg:   { $avg: "$amount" },
          },
        },
        { $sort: { total: -1 } },
        {
          $project: {
            _id:        0,
            category:   "$_id",
            total:      { $round: ["$total", 2] },
            count:      1,
            monthlyAvg: { $round: [{ $divide: ["$total", 6] }, 2] },
            percentage: 0, // computed below after we know totalSpent
          },
        },
      ]),

      // ── 3. Recurring expenses (subscription / habit detection) ─────────────
      // Items appearing 2+ times in 6 months = likely recurring cost
      Expense.aggregate([
        { $match: { user: userObjId, date: { $gte: sixMonthsAgo } } },
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
        { $match: { count: { $gte: 2 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id:             0,
            title:           1,
            category:        1,
            count:           1,
            total:           { $round: ["$total", 2] },
            monthlyEstimate: { $round: [{ $divide: ["$total", 6] }, 2] },
          },
        },
      ]),
    ]);

    // Compute category percentages now that we have totalSpent
    const totalSpent = summary.totalSpent || 0;
    const topCategories = categoryDetail.map((c) => ({
      ...c,
      percentage: totalSpent > 0
        ? Math.round((c.total / totalSpent) * 1000) / 10
        : 0,
    }));

    // Merge everything into a single context object for the agent
    return {
      ...summary,
      topCategories,
      recurringExpenses,
    };
  } catch {
    // Non-fatal — chat still works without financial context
    return {};
  }
};

// ─── Finance Analysis ─────────────────────────────────────────────────────────

/**
 * Fetches the user's expense summary from MongoDB, then passes it to the
 * financeAgent for Gemini-powered analysis.
 *
 * Separation of concerns: this service owns the orchestration.
 * The agent owns the prompt and parsing. The expense service owns the DB query.
 *
 * @param {string} userId
 * @returns {Promise<Object>} Parsed AI analysis result
 */
const getAIAnalysis = async (userId) => {
  const summary = await getExpenseSummary(userId);

  if (!summary || summary.count === 0) {
    throw ApiError.badRequest(
      "No expense data found. Add some expenses before requesting AI analysis."
    );
  }

  // Enrich summary with monthly data for the bar chart
  const enrichedSummary = {
    totalSpent:  summary.totalSpent,
    thisMonth:   summary.thisMonth,
    lastMonth:   summary.lastMonth,
    count:       summary.count,
    avgPerDay:   summary.avgPerDay,
    byCategory:  summary.byCategory,
    // monthlyData drives the bar chart on the frontend
    monthlyData: summary.monthly,
  };

  return analyzeExpenses(enrichedSummary);
};

// ─── Pattern Analysis ─────────────────────────────────────────────────────────

/**
 * Delegates to patternAnalyzerService which handles its own caching,
 * aggregation pipeline, and agent orchestration.
 *
 * @param {string} userId
 * @param {number} months
 * @param {boolean} forceRefresh
 * @returns {Promise<Object>}
 */
const getPatterns = async (userId, months, forceRefresh) => {
  return getPatternAnalysis(userId, months, forceRefresh);
};

// ─── AI Chat ──────────────────────────────────────────────────────────────────

/**
 * Processes a chat message through the chatAgent.
 *
 * Uses an enriched financial context (not just the basic summary) so the agent
 * can answer intent-specific questions:
 *  - Affordability: needs monthly surplus and category averages
 *  - Trend diagnosis: needs month-by-month breakdown and category detail
 *  - Budget planning: needs category averages and recurring costs
 *  - Savings coaching: needs top categories and recurring expenses
 *
 * chatHistory is passed from the client so multi-turn conversation state
 * is maintained on the frontend (stateless backend — scales horizontally).
 *
 * @param {string} userId
 * @param {string} message        - The user's current message
 * @param {Array}  chatHistory    - Prior Gemini-format [{role, parts}] turns
 * @returns {Promise<string>}     - The AI reply text
 */
const chat = async (userId, message, chatHistory = []) => {
  if (!message?.trim()) {
    throw ApiError.badRequest("Message cannot be empty.");
  }

  // Build enriched context — gracefully returns {} if user has no data yet
  const userContext = await buildChatContext(userId);

  return processChat(message.trim(), chatHistory, userContext);
};

export { getAIAnalysis, getPatterns, chat };
