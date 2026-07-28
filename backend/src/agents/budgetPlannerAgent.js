import { generateText } from "../services/groqService.js";
import {
  buildBudgetPlannerPrompt,
  buildSingleSectionBudgetPrompt,
  BUDGET_STATUSES,
  PRIORITY_LEVELS,
  SAVINGS_FREQUENCY,
  IMPACT_LEVELS,
  RISK_LEVELS,
} from "./prompts/budgetPrompt.js";
import ApiError from "../utils/ApiError.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cleanJSON  = (raw)  => raw.replace(/```json|```/gi, "").trim();
const safeParse  = (raw)  => { try { return JSON.parse(cleanJSON(raw)); } catch { return null; } };

// ─── Per-Section Validators ───────────────────────────────────────────────────

const validateSummary = (obj) =>
  obj &&
  typeof obj.monthlyIncome      === "number" &&
  typeof obj.totalBudgeted      === "number" &&
  typeof obj.totalSavingsTarget === "number" &&
  typeof obj.remainingBuffer    === "number" &&
  typeof obj.budgetHealthScore  === "number" && obj.budgetHealthScore >= 0 && obj.budgetHealthScore <= 100 &&
  ["A", "B", "C", "D", "F"].includes(obj.budgetHealthGrade) &&
  typeof obj.planSummary        === "string" && obj.planSummary.trim() &&
  typeof obj.basedOnMonths      === "number" &&
  typeof obj.estimationMethod   === "string" && obj.estimationMethod.trim();

const validateCategoryBudgets = (arr) =>
  Array.isArray(arr) &&
  arr.length > 0 &&
  arr.every((item) =>
    typeof item.category          === "string" && item.category.trim() &&
    typeof item.currentMonthlyAvg === "number" &&
    typeof item.recommendedBudget === "number" &&
    typeof item.changeFromCurrent === "number" &&
    typeof item.changePercent     === "number" &&
    BUDGET_STATUSES.includes(item.status) &&
    PRIORITY_LEVELS.includes(item.priority) &&
    typeof item.rationale         === "string" && item.rationale.trim() &&
    Array.isArray(item.tips) && item.tips.length >= 1
  );

const validateSavingsGoal = (obj) =>
  obj &&
  typeof obj.monthlyTarget   === "number" &&
  typeof obj.weeklyTarget    === "number" &&
  typeof obj.annualTarget    === "number" &&
  typeof obj.savingsRate     === "number" &&
  SAVINGS_FREQUENCY.includes(obj.frequency) &&
  typeof obj.goalName        === "string" && obj.goalName.trim() &&
  typeof obj.goalDescription === "string" && obj.goalDescription.trim() &&
  Array.isArray(obj.milestones) && obj.milestones.length === 3 &&
  obj.milestones.every(
    (m) =>
      typeof m.months === "number" &&
      typeof m.amount === "number" &&
      typeof m.label  === "string" && m.label.trim()
  ) &&
  RISK_LEVELS.includes(obj.riskLevel);

const validateBudgetInsights = (arr) =>
  Array.isArray(arr) &&
  arr.length >= 1 &&
  arr.every((item) =>
    typeof item.id          === "string" && item.id.trim() &&
    typeof item.title       === "string" && item.title.trim() &&
    typeof item.description === "string" && item.description.trim() &&
    IMPACT_LEVELS.includes(item.impact) &&
    typeof item.category    === "string" &&
    PRIORITY_LEVELS.includes(item.priority)
  );

const validateNextMonthForecast = (obj) =>
  obj &&
  typeof obj.projectedSpend   === "number" &&
  typeof obj.projectedSavings === "number" &&
  typeof obj.confidenceLevel  === "number" && obj.confidenceLevel >= 0 && obj.confidenceLevel <= 100 &&
  typeof obj.forecastBasis    === "string" && obj.forecastBasis.trim() &&
  Array.isArray(obj.warningFlags) &&
  obj.warningFlags.every(
    (f) =>
      typeof f.category === "string" &&
      typeof f.risk     === "string" &&
      ["high", "medium", "low"].includes(f.severity)
  );

const SECTION_VALIDATORS = {
  summary:             validateSummary,
  categoryBudgets:     validateCategoryBudgets,
  savingsGoal:         validateSavingsGoal,
  budgetInsights:      validateBudgetInsights,
  nextMonthForecast:   validateNextMonthForecast,
};

// ─── Parse & Validate ─────────────────────────────────────────────────────────

const parseAndValidate = (raw) => {
  const parsed = safeParse(raw);
  if (!parsed) return { parsed: null, sectionResults: {}, allValid: false };

  const sectionResults = {};
  let allValid = true;

  for (const [section, validator] of Object.entries(SECTION_VALIDATORS)) {
    const isValid = validator(parsed[section]);
    sectionResults[section] = isValid;
    if (!isValid) allValid = false;
  }

  return { parsed, sectionResults, allValid };
};

// ─── Structured Fallbacks ─────────────────────────────────────────────────────

const SECTION_FALLBACKS = {
  summary: {
    monthlyIncome:       0,
    totalBudgeted:       0,
    totalSavingsTarget:  0,
    remainingBuffer:     0,
    budgetHealthScore:   0,
    budgetHealthGrade:   "F",
    planSummary:         "Budget analysis unavailable. Please try again.",
    basedOnMonths:       0,
    estimationMethod:    "Unavailable.",
    fallback:            true,
  },
  categoryBudgets: [],
  savingsGoal: {
    monthlyTarget:   0,
    weeklyTarget:    0,
    annualTarget:    0,
    savingsRate:     0,
    frequency:       "monthly",
    goalName:        "Savings Goal",
    goalDescription: "Savings goal analysis unavailable. Please try again.",
    milestones: [
      { months: 3,  amount: 0, label: "3-month milestone" },
      { months: 6,  amount: 0, label: "6-month milestone" },
      { months: 12, amount: 0, label: "12-month milestone" },
    ],
    riskLevel: "high",
    fallback:  true,
  },
  budgetInsights: [
    {
      id:          "analysis-unavailable",
      title:       "Analysis Unavailable",
      description: "Budget insights could not be generated. Please refresh to retry.",
      impact:      "low",
      category:    "General",
      priority:    "low",
      fallback:    true,
    },
  ],
  nextMonthForecast: {
    projectedSpend:   0,
    projectedSavings: 0,
    confidenceLevel:  0,
    forecastBasis:    "Forecast unavailable. Please try again.",
    warningFlags:     [],
    fallback:         true,
  },
};

// ─── Core Agent Function ──────────────────────────────────────────────────────

/**
 * Generates a complete monthly budget plan using Gemini.
 *
 * Execution strategy:
 *  1. Attempt full analysis (single Gemini call)
 *  2. On failure, retry once with a stricter JSON reminder
 *  3. On second failure, recover each invalid section individually
 *  4. Any section that still fails gets a structured fallback
 *
 * @param {Object} context - Pre-aggregated spending data from the service layer
 * @returns {Promise<Object>} Validated budget plan
 */
const generateBudgetPlan = async (context) => {
  if (!context || typeof context !== "object") {
    throw ApiError.badRequest("Spending context data is required.");
  }

  const prompt = buildBudgetPlannerPrompt(context);

  // ── Attempt 1: Full plan ──────────────────────────────────────────────────
  const raw1    = await generateText(prompt);
  const result1 = parseAndValidate(raw1);

  if (result1.allValid) {
    console.log("[BudgetPlannerAgent] Full plan succeeded on attempt 1.");
    return result1.parsed;
  }

  // ── Attempt 2: Retry with stricter JSON instruction ───────────────────────
  const retryPrompt = `${prompt}\n\nCRITICAL REMINDER: Your response must be ONLY a raw JSON object. No markdown fences, no explanation, no text outside the JSON.`;
  const raw2        = await generateText(retryPrompt);
  const result2     = parseAndValidate(raw2);

  if (result2.allValid) {
    console.log("[BudgetPlannerAgent] Full plan succeeded on attempt 2.");
    return result2.parsed;
  }

  // ── Attempt 3: Per-section recovery ──────────────────────────────────────
  console.warn("[BudgetPlannerAgent] Full parse failed. Attempting per-section recovery.");

  const base = result2.parsed || result1.parsed || {};

  const failedSections = Object.entries(result2.sectionResults)
    .filter(([, valid]) => !valid)
    .map(([section]) => section);

  const recoveryResults = await Promise.allSettled(
    failedSections.map(async (section) => {
      const sectionPrompt = buildSingleSectionBudgetPrompt(context, section);
      const sectionRaw    = await generateText(sectionPrompt);
      const parsed        = safeParse(sectionRaw);
      const isValid       = parsed && SECTION_VALIDATORS[section](parsed[section]);
      return { section, value: isValid ? parsed[section] : null };
    })
  );

  const recovered = { ...base };
  let recoveredCount = 0;

  recoveryResults.forEach((result) => {
    if (result.status === "fulfilled" && result.value?.value !== null) {
      recovered[result.value.section] = result.value.value;
      recoveredCount++;
    } else {
      const section = failedSections[recoveryResults.indexOf(result)];
      if (!recovered[section] || !SECTION_VALIDATORS[section](recovered[section])) {
        recovered[section] = SECTION_FALLBACKS[section];
      }
    }
  });

  console.log(
    `[BudgetPlannerAgent] Recovery complete. Recovered ${recoveredCount}/${failedSections.length} sections.`
  );

  recovered.generatedAt     = new Date().toISOString();
  recovered.partialRecovery = recoveredCount < failedSections.length;

  return recovered;
};

export { generateBudgetPlan, SECTION_VALIDATORS };
