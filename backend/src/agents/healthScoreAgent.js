import { generateJSON }            from "../services/groqService.js";
import { buildHealthScorePrompt }  from "./prompts/healthScorePrompt.js";

// ─── Grade thresholds & Color Categories ──────────────────────────────────────
const getGrade = (score, context = {}) => {
  const { monthlyIncome = 0, monthlyBudget = 0 } = context;
  const budgetRatio = monthlyIncome > 0 ? (monthlyBudget / monthlyIncome) * 100 : 100;

  // High Budget (almost equal or > 85% of Income) -> RED (Poor)
  if (budgetRatio > 85 || monthlyBudget >= monthlyIncome) {
    return "Poor"; // Red color
  }
  // Medium Budget (61% - 85% of Income) -> YELLOW (Average)
  if (budgetRatio > 60) {
    return "Average"; // Yellow color
  }
  // Low Budget (<= 60% of Income) -> GREEN (Excellent)
  return "Excellent"; // Green color
};

// ─── Component scorers (each returns 0–100) ───────────────────────────────────

/** Savings rate ratio */
const scoreSavingsRate = (rate) => {
  if (rate <= 0) return 0;
  if (rate >= 30) return 100;
  if (rate >= 20) return Math.round(80 + ((rate - 20) / 10) * 20);
  if (rate >= 10) return Math.round(50 + ((rate - 10) / 10) * 30);
  return Math.round((rate / 10) * 50);
};

/** Budget vs Income Ratio Scorer */
const scoreBudgetToIncomeRatio = (budget, income) => {
  if (!income || income <= 0) return 30;
  if (!budget || budget <= 0) return 70;

  const ratio = (budget / income) * 100;

  // 1. Low Budget (<= 60% of income) -> High score (Green: 80 - 100)
  if (ratio <= 60) {
    return Math.round(100 - (ratio / 60) * 20);
  }
  // 2. Medium Budget (61% - 85% of income) -> Medium score (Yellow: 50 - 79)
  if (ratio <= 85) {
    return Math.round(79 - ((ratio - 60) / 25) * 29);
  }
  // 3. High / Almost Equal Budget (> 85% of income) -> Low score (Red: 10 - 49)
  if (ratio <= 100) {
    return Math.round(49 - ((ratio - 85) / 15) * 34);
  }
  // Budget > Income (Reckless overspending target) -> Low score (Red: 5 - 14)
  return Math.max(5, Math.round(14 - (ratio - 100) * 0.2));
};

/** Spending consistency */
const scoreSpendingConsistency = (monthlyAmounts) => {
  if (!monthlyAmounts || monthlyAmounts.length < 2) return 60;
  const mean = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;
  if (mean === 0) return 60;
  const variance = monthlyAmounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthlyAmounts.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(Math.min(100, Math.max(0, (1 - cv / 0.6) * 100)));
};

/** Expense-to-income ratio */
const scoreExpenseToIncome = (expenses, income) => {
  if (!income || income <= 0) return 40;
  const ratio = expenses / income;
  if (ratio <= 0.5) return 100;
  if (ratio >= 1.0) return 0;
  return Math.round((1 - ratio) / 0.5 * 100);
};

/** Debt ratio */
const scoreDebtRatio = (debtRatio) => {
  if (debtRatio === null || debtRatio === undefined) return 70;
  return Math.round(Math.min(100, Math.max(0, (1 - debtRatio) * 100)));
};

// ─── AI fallback ──────────────────────────────────────────────────────────────
const fallbackAI = (score, grade) => ({
  reason: `Your financial health score is ${score}/100 (${grade}). ${
    grade === "Excellent" ? "You have a low budget relative to your income, leaving high savings capacity." :
    grade === "Average" ? "Your budget is moderate relative to your monthly income. Consider lowering your budget to save more." :
    "Your target budget is almost equal to or higher than your monthly income, leaving high risk for debt."
  }`,
  improvementSuggestions: [
    "Lower your target budget relative to your monthly income to increase savings",
    "Aim to keep your monthly budget below 60% of your total income",
    "Allocate extra funds from your budget directly into an emergency fund",
    "Track all daily expenses to ensure actual spend stays below your target budget",
  ],
  positiveHabits: ["You are actively evaluating your monthly budget targets"],
  riskFactors: grade === "Poor" ? ["Target budget is almost equal to or exceeds monthly income"] : [],
});

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the financial health score and fetches AI recommendations.
 *
 * @param {Object} context
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

  const budgetToIncomeScore = scoreBudgetToIncomeRatio(monthlyBudget, monthlyIncome);

  const components = {
    savingsRate:         scoreSavingsRate(savingsRate),
    budgetAdherence:     budgetToIncomeScore,
    spendingConsistency: scoreSpendingConsistency(monthlyAmounts),
    expenseToIncome:     scoreExpenseToIncome(thisMonthExpenses, monthlyIncome),
    debtRatio:           scoreDebtRatio(debtRatio),
  };

  // 50% Weight to Budget-to-Income Ratio
  const finalScore = Math.round(
    budgetToIncomeScore * 0.50 +
    scoreSavingsRate(savingsRate) * 0.25 +
    scoreExpenseToIncome(thisMonthExpenses, monthlyIncome) * 0.25
  );

  const grade = getGrade(finalScore, context);
  const scoreData = { score: finalScore, grade, components };

  // ── AI recommendations ────────────────────────────────────────────────────
  let ai;
  try {
    const prompt = buildHealthScorePrompt(scoreData, { ...context, savingsRate });
    ai = await generateJSON(prompt, { temperature: 0.4, maxTokens: 1024 });

    if (!ai?.reason || !Array.isArray(ai?.improvementSuggestions)) {
      throw new Error("Invalid AI response shape");
    }
  } catch {
    console.warn("[HealthScoreAgent] AI call failed, using fallback.");
    ai = fallbackAI(finalScore, grade);
  }

  return {
    score: finalScore,
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
