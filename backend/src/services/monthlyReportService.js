import mongoose                  from "mongoose";
import Expense                   from "../models/Expense.js";
import MonthlyReport             from "../models/MonthlyReport.js";
import User                      from "../models/User.js";
import { generateMonthlyReport } from "../agents/monthlyReportAgent.js";
import ApiError                  from "../utils/ApiError.js";
import { createNotification }    from "./notificationService.js";

// ─── Health score helpers (mirrors healthScoreAgent logic) ────────────────────

const scoreSavingsRate         = (r)    => Math.min(100, Math.max(0, (r / 20) * 100));
const scoreBudgetAdherence     = (s, b) => !b ? 50 : s <= b ? 100 : s >= b * 1.5 ? 0 : Math.round((1.5 - s / b) / 0.5 * 100);
const scoreSpendingConsistency = (arr)  => {
  if (!arr || arr.length < 2) return 60;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  if (!mean) return 60;
  const cv = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) / mean;
  return Math.round(Math.min(100, Math.max(0, (1 - cv / 0.6) * 100)));
};
const scoreExpenseToIncome     = (e, i) => !i ? 40 : e <= i * 0.5 ? 100 : e >= i ? 0 : Math.round((1 - e / i) / 0.5 * 100);

// ─── MongoDB aggregation context builder ─────────────────────────────────────

const buildMonthlyContext = async (userId, year, month, monthlyIncome = 0) => {
  const userObjId  = new mongoose.Types.ObjectId(userId);
  const userObj    = await User.findById(userId).lean();
  const incomeToUse = Number(monthlyIncome) > 0 ? Number(monthlyIncome) : (userObj?.monthlyIncome || 0);
  const budgetToUse = userObj?.monthlyBudget || 0;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(year, month - 2, 1);
  const lastMonthEnd   = new Date(year, month - 1, 0, 23, 59, 59, 999);

  const reportMonthLabel = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const [
    totalsAgg,
    categoryAgg,
    dailyAgg,
    lastMonthAgg,
    lastMonthCatAgg,
    highLowAgg,
  ] = await Promise.all([

    // Overall totals for the month
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
    ]),

    // Category breakdown
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
      { $sort: { total: -1 } },
    ]),

    // Daily spending (for weekly grouping + day-of-week pattern)
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id:      { day: { $dayOfMonth: "$date" }, dow: { $dayOfWeek: "$date" } },
          total:    { $sum: "$amount" },
          count:    { $sum: 1 },
          topCat:   { $first: "$category" },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]),

    // Last month total
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Last month by category
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),

    // Highest and lowest single expense
    Expense.aggregate([
      { $match: { user: userObjId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $sort: { amount: -1 } },
      {
        $facet: {
          highest: [{ $limit: 1 }, { $project: { title: 1, amount: 1, category: 1, date: 1 } }],
          lowest:  [{ $sort: { amount: 1 } }, { $limit: 1 }, { $project: { title: 1, amount: 1, category: 1, date: 1 } }],
        },
      },
    ]),
  ]);

  const totalExpenses    = Math.round((totalsAgg[0]?.total || 0) * 100) / 100;
  const transactionCount = totalsAgg[0]?.count || 0;
  const daysInMonth      = monthEnd.getDate();
  const avgDailySpend    = Math.round((totalExpenses / daysInMonth) * 100) / 100;
  const lastMonthTotal   = lastMonthAgg[0]?.total || 0;
  const netSavings       = incomeToUse > 0 ? incomeToUse - totalExpenses : 0;
  const savingsRate      = incomeToUse > 0 ? Math.max(0, (netSavings / incomeToUse) * 100) : 0;

  // Last month category map for vs-last-month %
  const lastMonthCatMap = lastMonthCatAgg.reduce((acc, c) => { acc[c._id] = c.total; return acc; }, {});

  // Category breakdown with % and vs-last-month
  const categoryBreakdown = categoryAgg.map((c) => {
    const lastAmt = lastMonthCatMap[c._id] || 0;
    const vsLast  = lastAmt > 0 ? Math.round(((c.total - lastAmt) / lastAmt) * 1000) / 10 : 0;
    return {
      category:   c._id,
      total:      Math.round(c.total * 100) / 100,
      count:      c.count,
      percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 1000) / 10 : 0,
      avgPerTx:   Math.round(c.avg * 100) / 100,
      vsLastMonth: vsLast,
    };
  });

  // Weekly grouping (week 1 = days 1-7, week 2 = 8-14, etc.)
  const weeklyMap = { 1: { total: 0, count: 0, cats: {} }, 2: { total: 0, count: 0, cats: {} }, 3: { total: 0, count: 0, cats: {} }, 4: { total: 0, count: 0, cats: {} }, 5: { total: 0, count: 0, cats: {} } };
  dailyAgg.forEach((d) => {
    const wk = Math.min(Math.ceil(d._id.day / 7), 5);
    weeklyMap[wk].total += d.total;
    weeklyMap[wk].count += d.count;
    weeklyMap[wk].cats[d.topCat] = (weeklyMap[wk].cats[d.topCat] || 0) + d.total;
  });

  const DOW_NAMES = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowTotals = {};
  dailyAgg.forEach((d) => {
    const name = DOW_NAMES[d._id.dow] || "Unknown";
    dowTotals[name] = (dowTotals[name] || 0) + d.total;
  });
  const dailyPattern = Object.entries(dowTotals).map(([day, total]) => ({
    day,
    avgSpend: Math.round((total / (transactionCount || 1)) * 100) / 100,
  }));

  const weeklyData = Object.entries(weeklyMap)
    .filter(([, w]) => w.total > 0)
    .map(([wk, w]) => {
      const topCat = Object.entries(w.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      const startDay = (parseInt(wk) - 1) * 7 + 1;
      const endDay   = Math.min(parseInt(wk) * 7, daysInMonth);
      return {
        week:        `Week ${wk} (${startDay}-${endDay})`,
        weekNumber:  parseInt(wk),
        totalSpent:  Math.round(w.total * 100) / 100,
        txCount:     w.count,
        topCategory: topCat,
      };
    });

  // Monthly amounts array for consistency scoring (just this month's weekly totals)
  const weeklyAmounts = weeklyData.map((w) => w.totalSpent);

  // Target budget for adherence score (use budgetToUse if configured, else 80% of incomeToUse)
  const targetBudget = budgetToUse > 0 ? budgetToUse : incomeToUse * 0.8;

  // Health score components
  const healthComponents = {
    savingsRate:         Math.round(scoreSavingsRate(savingsRate)),
    budgetAdherence:     Math.round(scoreBudgetAdherence(totalExpenses, targetBudget)),
    spendingConsistency: Math.round(scoreSpendingConsistency(weeklyAmounts)),
    expenseToIncome:     Math.round(scoreExpenseToIncome(totalExpenses, incomeToUse)),
  };

  const monthOverMonthChange = lastMonthTotal > 0
    ? Math.round(((totalExpenses - lastMonthTotal) / lastMonthTotal) * 1000) / 10
    : 0;

  return {
    reportMonthLabel,
    year, month,
    totalExpenses,
    transactionCount,
    avgDailySpend,
    monthlyIncome: incomeToUse,
    netSavings:    Math.round(netSavings * 100) / 100,
    savingsRate:   Math.round(savingsRate * 10) / 10,
    highestExpense: highLowAgg[0]?.highest[0] || null,
    lowestExpense:  highLowAgg[0]?.lowest[0]  || null,
    categoryBreakdown,
    weeklyData,
    dailyPattern,
    lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
    monthOverMonthChange,
    healthComponents,
  };
};

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Generates a fresh monthly report, persists it, and returns it.
 *
 * @param {string} userId
 * @param {number} year
 * @param {number} month        - 1-indexed
 * @param {number} monthlyIncome
 * @param {boolean} forceRegenerate
 * @returns {Promise<Object>}
 */
const generateReport = async (userId, year, month, monthlyIncome = 0, forceRegenerate = false) => {
  if (month < 1 || month > 12) throw ApiError.badRequest("Invalid month. Must be 1–12.");
  if (year < 2020 || year > new Date().getFullYear() + 1) throw ApiError.badRequest("Invalid year.");

  const reportMonth = `${year}-${String(month).padStart(2, "0")}`;

  if (forceRegenerate) {
    await MonthlyReport.deleteMany({ user: userId, reportMonth });
  } else {
    const existing = await MonthlyReport.findOne({ user: userId, reportMonth, status: "success" })
      .sort({ createdAt: -1 })
      .lean();
    if (existing) {
      return existing;
    }
  }

  const ctx = await buildMonthlyContext(userId, year, month, monthlyIncome);

  if (ctx.transactionCount === 0) {
    throw ApiError.badRequest(`No expenses found for ${ctx.reportMonthLabel}. Add expenses first.`);
  }

  // Create a pending record first
  const record = await MonthlyReport.create({
    user: userId,
    reportMonth,
    status: "pending",
    data: {},
  });

  try {
    const aiResult = await generateMonthlyReport(ctx);

    // Merge computed data with AI output
    const data = {
      summary: {
        totalIncome:      ctx.monthlyIncome,
        totalExpenses:    ctx.totalExpenses,
        netSavings:       ctx.netSavings,
        savingsRate:      ctx.savingsRate,
        transactionCount: ctx.transactionCount,
        avgDailySpend:    ctx.avgDailySpend,
        highestExpense:   ctx.highestExpense,
        lowestExpense:    ctx.lowestExpense,
        mostExpensiveDay: aiResult.summary?.mostExpensiveDay || "N/A",
        overview:         aiResult.summary?.overview || "",
        keyTakeaway:      aiResult.summary?.keyTakeaway || "",
      },
      categoryBreakdown: ctx.categoryBreakdown.map((c) => {
        const insight = aiResult.categoryInsights?.find((ci) => ci.category === c.category);
        return { ...c, trend: insight?.trend || "stable", insight: insight?.insight || "", recommendation: insight?.recommendation || "" };
      }),
      budgetPerformance: {
        score:                 aiResult.budgetPerformance?.score || 0,
        grade:                 aiResult.budgetPerformance?.grade || "F",
        totalBudget:           ctx.monthlyIncome * 0.8,
        totalSpent:            ctx.totalExpenses,
        variance:              Math.round((ctx.monthlyIncome * 0.8 - ctx.totalExpenses) * 100) / 100,
        summary:               aiResult.budgetPerformance?.summary || "",
        topOverspendCategory:  aiResult.budgetPerformance?.topOverspendCategory || null,
        topUnderspendCategory: aiResult.budgetPerformance?.topUnderspendCategory || null,
      },
      healthScore: {
        score:      aiResult.healthScore?.score || 0,
        grade:      aiResult.healthScore?.grade || "Poor",
        components: ctx.healthComponents,
        summary:    aiResult.healthScore?.summary || "",
      },
      weeklyAnalysis: ctx.weeklyData.map((w, i) => {
        const wi = aiResult.weeklyInsights?.[i];
        return { ...w, insight: wi?.insight || "", standoutFact: wi?.standoutFact || "" };
      }),
      spendingTrends: {
        direction:        aiResult.spendingTrends?.direction || "stable",
        changePercent:    ctx.monthOverMonthChange,
        peakDay:          aiResult.spendingTrends?.peakDay || "N/A",
        peakWeek:         aiResult.spendingTrends?.peakWeek || "Week 1",
        consistencyScore: aiResult.spendingTrends?.consistencyScore || 50,
        dailyPattern:     ctx.dailyPattern,
        insight:          aiResult.spendingTrends?.insight || "",
      },
      aiRecommendations: aiResult.aiRecommendations || {},
    };

    record.status = "success";
    record.data   = data;
    await record.save();

    // Fire report_ready notification
    createNotification(record.user, {
      type: "report_ready",
      title: "Monthly Report Ready 📊",
      message: `Your AI Financial Report for ${reportMonth} has been generated. View insights, health score, and recommendations.`,
      severity: "info",
      metadata: { reportMonth },
    }).catch(() => {});

    return record.toObject();
  } catch (err) {
    record.status       = "failed";
    record.errorMessage = err.message;
    await record.save();
    throw err;
  }
};

/**
 * Returns the latest successful report for a given month.
 *
 * @param {string} userId
 * @param {string} reportMonth - "YYYY-MM"
 * @returns {Promise<Object|null>}
 */
const getReport = async (userId, reportMonth) =>
  MonthlyReport.findOne({ user: userId, reportMonth, status: "success" })
    .sort({ createdAt: -1 })
    .lean();

/**
 * Returns a list of months that have reports (for the history selector).
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const listReports = async (userId) =>
  MonthlyReport.find({ user: userId, status: "success" })
    .sort({ reportMonth: -1 })
    .select("reportMonth createdAt data.summary.totalExpenses data.healthScore.score data.healthScore.grade")
    .limit(24)
    .lean();

export { generateReport, getReport, listReports };
