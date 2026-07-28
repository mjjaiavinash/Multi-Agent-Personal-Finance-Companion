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

  const prompt = buildSavingsAdvisorPrompt(context);

  // ── Attempt 1: Full analysis ──────────────────────────────────────────────
  const raw1     = await generateText(prompt);
  const result1  = parseAndValidate(raw1);

  if (result1.allValid) {
    console.log("[SavingsAdvisorAgent] Full analysis succeeded on attempt 1.");
    return result1.parsed;
  }

  // ── Attempt 2: Retry with stricter JSON instruction ───────────────────────
  const retryPrompt = `${prompt}\n\nCRITICAL REMINDER: Your response must be ONLY a raw JSON object. No markdown fences, no explanation, no text outside the JSON.`;
  const raw2        = await generateText(retryPrompt);
  const result2     = parseAndValidate(raw2);

  if (result2.allValid) {
    console.log("[SavingsAdvisorAgent] Full analysis succeeded on attempt 2.");
    return result2.parsed;
  }

  // ── Attempt 3: Per-section recovery ──────────────────────────────────────
  console.warn("[SavingsAdvisorAgent] Full parse failed. Attempting per-section recovery.");

  // Start with the best partial result we have from attempts 1 & 2
  const base = result2.parsed || result1.parsed || {};

  // Identify which sections failed validation
  const failedSections = Object.entries(result2.sectionResults)
    .filter(([, valid]) => !valid)
    .map(([section]) => section);

  // Re-run each failed section with a focused single-section prompt
  const recoveryResults = await Promise.allSettled(
    failedSections.map(async (section) => {
      const sectionPrompt = buildSingleSectionPrompt(context, section);
      const sectionRaw    = await generateText(sectionPrompt);
      const parsed        = safeParse(sectionRaw);

      // Validate the recovered section
      const isValid = parsed && SECTION_VALIDATORS[section](parsed[section]);
      return { section, value: isValid ? parsed[section] : null };
    })
  );

  // Merge recovered sections into the base result
  const recovered = { ...base };
  let recoveredCount = 0;

  recoveryResults.forEach((result) => {
    if (result.status === "fulfilled" && result.value?.value !== null) {
      recovered[result.value.section] = result.value.value;
      recoveredCount++;
    } else {
      // Use structured fallback for sections that could not be recovered
      const section = failedSections[recoveryResults.indexOf(result)];
      if (!recovered[section] || !SECTION_VALIDATORS[section](recovered[section])) {
        recovered[section] = SECTION_FALLBACKS[section];
      }
    }
  });

  console.log(
    `[SavingsAdvisorAgent] Recovery complete. Recovered ${recoveredCount}/${failedSections.length} sections.`
  );

  recovered.generatedAt     = new Date().toISOString();
  recovered.partialRecovery = recoveredCount < failedSections.length;

  return recovered;
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
