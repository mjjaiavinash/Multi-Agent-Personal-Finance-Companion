import { generateJSON }            from "../services/groqService.js";
import { buildHealthScorePrompt }  from "./prompts/healthScorePrompt.js";

// ─── Grade thresholds ─────────────────────────────────────────────────────────
const getGrade = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Poor";
};

// ─── Component scorers (each returns 0–100) ───────────────────────────────────

/** Savings rate: 20%+ = 100, 0% = 0 */
const scoreSavingsRate = (rate) => Math.min(100, Math.max(0, (rate / 20) * 100));

/** Budget adherence: spending ≤ budget = 100, 50% over = 0 */
const scoreBudgetAdherence = (spent, budget) => {
  if (!budget || budget <= 0) return 50; // no budget set — neutral
  const ratio = spent / budget;
  if (ratio <= 1)   return 100;
  if (ratio >= 1.5) return 0;
  return Math.round((1.5 - ratio) / 0.5 * 100);
};

/** Spending consistency: low CV = consistent = high score */
const scoreSpendingConsistency = (monthlyAmounts) => {
  if (!monthlyAmounts || monthlyAmounts.length < 2) return 60; // not enough data
  const mean = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;
  if (mean === 0) return 60;
  const variance = monthlyAmounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthlyAmounts.length;
  const cv = Math.sqrt(variance) / mean; // coefficient of variation
  // CV < 0.1 = very consistent (100), CV > 0.6 = very volatile (0)
  return Math.round(Math.min(100, Math.max(0, (1 - cv / 0.6) * 100)));
};

/** Expense-to-income ratio: <50% = 100, >100% = 0 */
const scoreExpenseToIncome = (expenses, income) => {
  if (!income || income <= 0) return 40; // no income data — below neutral
  const ratio = expenses / income;
  if (ratio <= 0.5)  return 100;
  if (ratio >= 1.0)  return 0;
  return Math.round((1 - ratio) / 0.5 * 100);
};

/** Debt ratio: 0 debt = 100, high debt = lower score */
const scoreDebtRatio = (debtRatio) => {
  if (debtRatio === null || debtRatio === undefined) return 70; // unknown = slightly above neutral
  return Math.round(Math.min(100, Math.max(0, (1 - debtRatio) * 100)));
};

// ─── Weighted composite score ─────────────────────────────────────────────────
const WEIGHTS = {
  savingsRate:         0.30,
  budgetAdherence:     0.25,
  spendingConsistency: 0.15,
  expenseToIncome:     0.20,
  debtRatio:           0.10,
};

const computeComposite = (components) =>
  Math.round(
    Object.entries(WEIGHTS).reduce(
      (sum, [key, weight]) => sum + (components[key] || 0) * weight,
      0
    )
  );

// ─── AI fallback ──────────────────────────────────────────────────────────────
const fallbackAI = (score) => ({
  reason: `Your financial health score is ${score}/100. ${
    score >= 80 ? "You are managing your finances excellently." :
    score >= 60 ? "You are on a good financial track with room for improvement." :
    score >= 40 ? "Your finances need attention in several areas." :
    "Your finances require immediate attention and restructuring."
  }`,
  improvementSuggestions: [
    "Track all expenses daily to identify spending leaks",
    "Set a strict monthly budget for each category",
    "Aim to save at least 20% of your monthly income",
    "Review and cut subscriptions or recurring charges",
  ],
  positiveHabits: ["You are actively monitoring your finances"],
  riskFactors:    score < 60 ? ["High expense-to-income ratio detected"] : [],
});

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the financial health score and fetches AI recommendations.
 *
 * @param {Object} context
 * @param {number} context.monthlyIncome
 * @param {number} context.thisMonthExpenses
 * @param {number} context.monthlyBudget
 * @param {number[]} context.monthlyAmounts   - Array of monthly totals (last N months)
 * @param {number|null} context.debtRatio     - 0–1 or null if unknown
 * @param {Object} context.byCategory
 * @param {string} context.topCategory
 * @param {string} context.trend
 * @param {number} context.monthsAnalyzed
 * @returns {Promise<Object>}
 */
const computeHealthScore = async (context) => {
  const {
    monthlyIncome       = 0,
    thisMonthExpenses   = 0,
    monthlyBudget       = 0,
    monthlyAmounts      = [],
    debtRatio           = null,
  } = context;

  const savingsRate = monthlyIncome > 0
    ? Math.max(0, ((monthlyIncome - thisMonthExpenses) / monthlyIncome) * 100)
    : 0;

  const components = {
    savingsRate:         scoreSavingsRate(savingsRate),
    budgetAdherence:     scoreBudgetAdherence(thisMonthExpenses, monthlyBudget),
    spendingConsistency: scoreSpendingConsistency(monthlyAmounts),
    expenseToIncome:     scoreExpenseToIncome(thisMonthExpenses, monthlyIncome),
    debtRatio:           scoreDebtRatio(debtRatio),
  };

  const score = computeComposite(components);
  const grade = getGrade(score);

  const scoreData = { score, grade, components };

  // ── AI recommendations ────────────────────────────────────────────────────
  let ai;
  try {
    const prompt = buildHealthScorePrompt(scoreData, { ...context, savingsRate });
    ai = await generateJSON(prompt, { temperature: 0.4, maxTokens: 1024 });

    // Validate shape
    if (!ai?.reason || !Array.isArray(ai?.improvementSuggestions)) {
      throw new Error("Invalid AI response shape");
    }
  } catch {
    console.warn("[HealthScoreAgent] AI call failed, using fallback.");
    ai = fallbackAI(score);
  }

  return {
    score,
    grade,
    components,
    inputs: {
      monthlyIncome,
      totalExpenses: thisMonthExpenses,
      monthlyBudget,
      monthsAnalyzed: context.monthsAnalyzed || 1,
    },
    ai,
  };
};

export { computeHealthScore, getGrade };
