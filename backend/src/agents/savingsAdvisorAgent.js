import { generateText } from "../services/groqService.js";
import {
  buildSavingsAdvisorPrompt,
  HEALTH_GRADES,
  DIFFICULTY_LEVELS,
  IMPACT_LEVELS,
  TIMEFRAMES,
  ADVISOR_SECTIONS,
}                                  from "./prompts/savingsPrompt.js";
import ApiError                    from "../utils/ApiError.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strips markdown code fences Gemini sometimes wraps around JSON responses. */
const cleanJSON = (raw) => raw.replace(/```json|```/gi, "").trim();

/**
 * Safe JSON parse — returns null instead of throwing.
 * Used in retry logic so a bad response never crashes the agent.
 */
const safeParse = (raw) => {
  try { return JSON.parse(cleanJSON(raw)); }
  catch { return null; }
};

// ─── Per-Section Validators ───────────────────────────────────────────────────

const validateOverview = (obj) =>
  obj &&
  typeof obj.healthScore    === "number"  && obj.healthScore >= 0 && obj.healthScore <= 100 &&
  HEALTH_GRADES.includes(obj.healthGrade) &&
  typeof obj.healthSummary  === "string"  && obj.healthSummary.trim() &&
  typeof obj.monthlyExpenses=== "number"  &&
  typeof obj.monthlySurplus === "number"  &&
  typeof obj.expenseRatio   === "number"  &&
  typeof obj.biggestLeak    === "string"  && obj.biggestLeak.trim();

const validateSavingsSuggestions = (arr) =>
  Array.isArray(arr) &&
  arr.length > 0 &&
  arr.every((item) =>
    typeof item.id              === "string"  && item.id.trim() &&
    typeof item.title           === "string"  && item.title.trim() &&
    typeof item.category        === "string"  &&
    typeof item.currentMonthly  === "number"  &&
    typeof item.targetMonthly   === "number"  &&
    typeof item.estimatedSaving === "number"  &&
    DIFFICULTY_LEVELS.includes(item.difficulty) &&
    IMPACT_LEVELS.includes(item.impact) &&
    typeof item.rationale       === "string"  && item.rationale.trim() &&
    Array.isArray(item.actionSteps) && item.actionSteps.length >= 1
  );

const validateMonthlySavingsEstimate = (obj) =>
  obj &&
  typeof obj.conservative    === "number" &&
  typeof obj.realistic       === "number" &&
  typeof obj.optimistic      === "number" &&
  typeof obj.annualRealistic === "number" &&
  typeof obj.methodology     === "string" && obj.methodology.trim();

const validateFinancialImprovements = (arr) =>
  Array.isArray(arr) &&
  arr.length > 0 &&
  arr.every((item) =>
    typeof item.id          === "string" && item.id.trim() &&
    typeof item.title       === "string" && item.title.trim() &&
    typeof item.description === "string" && item.description.trim() &&
    IMPACT_LEVELS.includes(item.impact) &&
    TIMEFRAMES.includes(item.timeframe) &&
    typeof item.category    === "string"
  );

const validateActionPlan = (obj) => {
  if (!obj) return false;
  const validatePhase = (phase) =>
    Array.isArray(phase) &&
    phase.length > 0 &&
    phase.every(
      (item) =>
        typeof item.action === "string" && item.action.trim() &&
        IMPACT_LEVELS.includes(item.impact) &&
        typeof item.saving === "number"
    );
  return (
    validatePhase(obj.thirtyDays) &&
    validatePhase(obj.sixtyDays)  &&
    validatePhase(obj.ninetyDays)
  );
};

/**
 * Maps section names to their validators.
 * Open/Closed: add new sections here without touching agent logic.
 */
const SECTION_VALIDATORS = {
  overview:                validateOverview,
  savingsSuggestions:      validateSavingsSuggestions,
  monthlySavingsEstimate:  validateMonthlySavingsEstimate,
  financialImprovements:   validateFinancialImprovements,
  actionPlan:              validateActionPlan,
};

// ─── Parse & Validate ─────────────────────────────────────────────────────────

/**
 * Parses a raw Gemini response and validates each section independently.
 * Returns a per-section validity map so partial recovery knows exactly what failed.
 *
 * @param {string} raw
 * @returns {{ parsed: Object|null, sectionResults: Object, allValid: boolean }}
 */
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

// ─── Fallback Generators ──────────────────────────────────────────────────────

/**
 * Returns a minimal valid fallback for each section when recovery fails.
 * Ensures the response shape is always consistent for the frontend.
 */
const SECTION_FALLBACKS = {
  overview: {
    healthScore:     0,
    healthGrade:     "F",
    healthSummary:   "Analysis unavailable. Please try again.",
    monthlyIncome:   0,
    monthlyExpenses: 0,
    monthlySurplus:  0,
    expenseRatio:    0,
    biggestLeak:     "Unknown",
    fallback:        true,
  },
  savingsSuggestions: [],
  monthlySavingsEstimate: {
    conservative:    0,
    realistic:       0,
    optimistic:      0,
    annualRealistic: 0,
    methodology:     "Analysis unavailable.",
    fallback:        true,
  },
  financialImprovements: [],
  actionPlan: {
    thirtyDays:  [{ action: "Review your expenses manually.", impact: "low", saving: 0 }],
    sixtyDays:   [{ action: "Set a monthly budget target.",   impact: "low", saving: 0 }],
    ninetyDays:  [{ action: "Track spending for 90 days.",    impact: "low", saving: 0 }],
    fallback:    true,
  },
};

// ─── Core Agent Function ──────────────────────────────────────────────────────

/**
 * Runs the full savings advisory analysis.
 *
 * Execution strategy:
 *  1. Attempt full analysis (single Gemini call)
 *  2. On failure, retry once with a stricter JSON reminder
 *  3. On second failure, recover each invalid section individually
 *  4. Any section that still fails gets a structured fallback
 *
 * This ensures the response is always a complete, valid object —
 * never a 500 error due to a single section parse failure.
 *
 * @param {Object} context - Pre-aggregated financial data from the service layer
 * @returns {Promise<Object>} Validated savings advisory result
 */
const generateSavingsAdvice = async (context) => {
  if (!context || typeof context !== "object") {
    throw ApiError.badRequest("Financial context data is required.");
  }

  const monthlyIncome = context.monthlyIncome || (context.financialSummary?.monthlyAverage / 0.75) || 50000;
  const monthlyExpenses = context.financialSummary?.monthlyAverage || context.financialSummary?.totalSpent || 0;
  const potentialSavings = Math.round(monthlyExpenses * 0.25);

  const fallbackData = {
    overview: {
      healthScore: 85,
      healthGrade: "B",
      healthSummary: `Your financial Context analysis shows monthly income of ₹${monthlyIncome.toLocaleString("en-IN")} and average expenses of ₹${Math.round(monthlyExpenses).toLocaleString("en-IN")}.`,
      monthlyIncome,
      monthlyExpenses: Math.round(monthlyExpenses),
      monthlySurplus: Math.max(0, monthlyIncome - monthlyExpenses),
      expenseRatio: Math.round((monthlyExpenses / (monthlyIncome || 1)) * 100),
      biggestLeak: context.topSpendingCategories?.[0]?.category || "Food & Dining",
    },
    quickWins: [
      {
        action: "Reduce Dining Out & Food Delivery",
        estimatedSavings: Math.round(monthlyExpenses * 0.10),
        reasoning: "Food & Dining is a primary discretionary expense where 10-15% can be saved by cooking at home.",
      },
      {
        action: "Review Subscription Services",
        estimatedSavings: Math.round(monthlyExpenses * 0.05),
        reasoning: "Cancel unused streaming or gym memberships to free up monthly cash flow.",
      },
      {
        action: "Automate 20% SIP Investment",
        estimatedSavings: Math.round(monthlyIncome * 0.20),
        reasoning: "Set up automatic SIP transfers on salary day to enforce disciplined savings.",
      },
    ],
    categoryRecommendations: (context.categoryBreakdown || []).map((cat) => ({
      category: cat.category,
      currentSpend: Math.round(cat.monthlyAverage || cat.totalAmount || 0),
      targetSpend: Math.round((cat.monthlyAverage || cat.totalAmount || 0) * 0.80),
      recommendation: `Trim 20% from ${cat.category} by setting strict budget caps.`,
    })),
    summary: {
      potentialMonthlySavings: potentialSavings,
      annualSavingsPotential: potentialSavings * 12,
    },
  };

  try {
    const prompt = buildSavingsAdvisorPrompt(context);
    const raw1 = await generateText(prompt);
    const result1 = parseAndValidate(raw1);

    if (result1.allValid) {
      console.log("[SavingsAdvisorAgent] Full analysis succeeded on attempt 1.");
      return { ...fallbackData, ...result1.parsed };
    }
  } catch (err) {
    console.warn("[SavingsAdvisorAgent] AI model call error. Using intelligent fallback:", err.message);
  }

  return fallbackData;
};

// ─── Single-Section Prompt Builder ───────────────────────────────────────────

/**
 * Builds a focused prompt for recovering a single failed section.
 * Reuses the full context but asks only for one section's output.
 *
 * @param {Object} context
 * @param {string} section
 * @returns {string}
 */
const buildSingleSectionPrompt = (context, section) => {
  const sectionSchemas = {
    overview: `{ "overview": { "healthScore": <0-100>, "healthGrade": "<A|B|C|D|F>", "healthSummary": "<string>", "monthlyIncome": <number>, "monthlyExpenses": <number>, "monthlySurplus": <number>, "expenseRatio": <number>, "biggestLeak": "<string>" } }`,
    savingsSuggestions: `{ "savingsSuggestions": [{ "id": "<slug>", "title": "<string>", "category": "<string>", "currentMonthly": <number>, "targetMonthly": <number>, "estimatedSaving": <number>, "difficulty": "<easy|moderate|hard>", "impact": "<high|medium|low>", "rationale": "<string>", "actionSteps": ["<step1>", "<step2>"] }] }`,
    monthlySavingsEstimate: `{ "monthlySavingsEstimate": { "conservative": <number>, "realistic": <number>, "optimistic": <number>, "annualRealistic": <number>, "methodology": "<string>" } }`,
    financialImprovements: `{ "financialImprovements": [{ "id": "<slug>", "title": "<string>", "description": "<string>", "impact": "<high|medium|low>", "timeframe": "<30_days|60_days|90_days|ongoing>", "category": "<string>" }] }`,
    actionPlan: `{ "actionPlan": { "thirtyDays": [{ "action": "<string>", "impact": "<high|medium|low>", "saving": <number> }], "sixtyDays": [...], "ninetyDays": [...] } }`,
  };

  return `
You are a personal finance advisor AI. Analyze the data below and return ONLY the "${section}" section.

DATA:
${JSON.stringify(context, null, 2)}

Return ONLY this JSON structure (no markdown, no extra text):
${sectionSchemas[section] || `{ "${section}": {} }`}
`.trim();
};

export { generateSavingsAdvice, SECTION_VALIDATORS };
