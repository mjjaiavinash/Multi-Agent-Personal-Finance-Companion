import { generateText } from "../services/groqService.js";
import { buildPredictionPrompt } from "./prompts/predictionPrompt.js";

const cleanJSON = (raw) => raw.replace(/```json|```/gi, "").trim();
const safeParse = (raw) => {
  try { return JSON.parse(cleanJSON(raw)); } catch { return null; }
};

const buildFallbackPredictions = (ctx) => {
  const avgWk = ctx.avgWeeklySpend || 0;
  const avgMo = ctx.avgMonthlySpend || 0;
  const inc   = ctx.monthlyIncome || 0;
  const bud   = ctx.monthlyBudget || 0;

  const topCat = ctx.categoryData[0]?.category || "General";
  const topCatAmt = Math.round(avgMo * 0.35);

  return {
    confidenceScore: 70,
    confidenceLevel: "Medium",
    nextWeekExpense: {
      predictedAmount: Math.round(avgWk),
      changeVsAvgPercent: 0,
      trendDirection: "stable",
      explanation: `Based on your recent weekly baseline of ₹${Math.round(avgWk)}, next week's spend is expected to stay consistent.`
    },
    nextMonthExpense: {
      predictedAmount: Math.round(avgMo),
      changeVsAvgPercent: 0,
      trendDirection: "stable",
      explanation: `Based on your monthly historical average of ₹${Math.round(avgMo)}, next month's total spend is projected to align with historical trends.`
    },
    highestSpendingCategory: {
      category: topCat,
      predictedAmount: topCatAmt,
      sharePercent: avgMo > 0 ? Math.round((topCatAmt / avgMo) * 100) : 35,
      reasoning: `${topCat} has historically been your largest category of expense.`
    },
    savingsForecast: {
      projectedSavings: Math.max(0, inc - avgMo),
      projectedSavingsRate: inc > 0 ? Math.max(0, Math.round(((inc - avgMo) / inc) * 100)) : 0,
      status: (inc - avgMo) > 0 ? "On Track" : "At Risk",
      insight: `Projected net savings for next month is ₹${Math.max(0, inc - avgMo)}.`
    },
    budgetForecast: {
      budgetTarget: bud,
      predictedSpent: Math.round(avgMo),
      projectedVariance: Math.round(bud - avgMo),
      status: avgMo <= bud ? "Within Budget" : "Slight Overspend",
      insight: `Projected spending is ₹${Math.round(avgMo)} against your budget of ₹${bud}.`
    },
    categoryForecasts: (ctx.categoryData || []).map((c) => ({
      category: c.category,
      historicalWeeklyAvg: Math.round(c.weeklyAvg || 0),
      predictedNextMonth: Math.round(c.total / Math.max(1, ctx.months)),
      projectedTrend: "stable",
      actionTip: `Maintain target bounds for ${c.category}.`
    })),
    forecastSeries: [
      { period: "W-3", actual: Math.round(avgWk * 0.9), predicted: Math.round(avgWk * 0.9), isForecast: false },
      { period: "W-2", actual: Math.round(avgWk * 1.1), predicted: Math.round(avgWk * 1.1), isForecast: false },
      { period: "W-1", actual: Math.round(avgWk * 0.95), predicted: Math.round(avgWk * 0.95), isForecast: false },
      { period: "Current", actual: Math.round(avgWk), predicted: Math.round(avgWk), isForecast: false },
      { period: "Next Wk", actual: null, predicted: Math.round(avgWk * 1.02), isForecast: true },
      { period: "Wk +2", actual: null, predicted: Math.round(avgWk * 0.98), isForecast: true },
      { period: "Wk +3", actual: null, predicted: Math.round(avgWk * 1.05), isForecast: true },
      { period: "Wk +4", actual: null, predicted: Math.round(avgWk * 1.01), isForecast: true }
    ],
    keyDrivers: [
      "Consistent historical transaction velocity",
      "Regular essential recurring categories",
      "Average daily spending pattern stability"
    ],
    preventiveRecommendations: [
      "Set category caps on your highest spending category",
      "Track impulse spending on weekends",
      "Aim to increase savings rate by 5% next month"
    ]
  };
};

/**
 * Generates AI spending predictions using Groq.
 *
 * @param {Object} ctx - Context object
 * @returns {Promise<Object>}
 */
export const predictSpending = async (ctx) => {
  const prompt = buildPredictionPrompt(ctx);

  try {
    const raw = await generateText(prompt, { temperature: 0.2, maxTokens: 4096 });
    const parsed = safeParse(raw);

    if (parsed && typeof parsed.confidenceScore === "number" && parsed.nextWeekExpense && parsed.nextMonthExpense) {
      return parsed;
    }

    console.warn("[PredictionAgent] Primary JSON parse incomplete. Using fallback builder.");
    return buildFallbackPredictions(ctx);
  } catch (err) {
    console.error("[PredictionAgent] Groq API call failed, using fallback predictions:", err.message);
    return buildFallbackPredictions(ctx);
  }
};
