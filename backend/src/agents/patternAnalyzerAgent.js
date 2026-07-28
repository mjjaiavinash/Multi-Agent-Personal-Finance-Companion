import { generateText } from "../services/groqService.js";
import {
  buildPatternPrompt,
  buildSingleDimensionPrompt,
  PATTERN_SCHEMA,
  TREND_DIRECTIONS,
  PRIORITY_LEVELS,
}                                      from "./prompts/patternPrompt.js";
import ApiError                        from "../utils/ApiError.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cleanJSON = (raw) => raw.replace(/```json|```/gi, "").trim();

/**
 * Validates the highestSpendingCategory section.
 */
const validateHighestCategory = (obj) =>
  obj &&
  typeof obj.category      === "string" && obj.category.trim() &&
  typeof obj.totalAmount   === "number" && obj.totalAmount >= 0 &&
  typeof obj.percentage    === "number" &&
  typeof obj.monthlyAverage=== "number" &&
  TREND_DIRECTIONS.includes(obj.trend) &&
  typeof obj.insight       === "string" && obj.insight.trim();

/**
 * Validates the monthlyTrend section.
 */
const validateMonthlyTrend = (obj) =>
  obj &&
  TREND_DIRECTIONS.includes(obj.direction) &&
  typeof obj.changePercent  === "number" &&
  typeof obj.peakMonth      === "string"  && obj.peakMonth.trim() &&
  typeof obj.lowestMonth    === "string"  && obj.lowestMonth.trim() &&
  typeof obj.averageMonthly === "number"  &&
  typeof obj.forecast       === "number"  &&
  typeof obj.insight        === "string"  && obj.insight.trim();

/**
 * Validates the frequentExpenses section.
 */
const validateFrequentExpenses = (obj) =>
  obj &&
  Array.isArray(obj.items) &&
  obj.items.every(
    (item) =>
      typeof item.title         === "string"  && item.title.trim() &&
      typeof item.frequency     === "number"  &&
      typeof item.averageAmount === "number"  &&
      typeof item.totalAmount   === "number"  &&
      typeof item.category      === "string"  &&
      typeof item.insight       === "string"
  );

/**
 * Validates the unnecessaryExpenses section.
 */
const validateUnnecessaryExpenses = (obj) =>
  obj &&
  typeof obj.totalWasted      === "number" &&
  typeof obj.savingsPotential === "number" &&
  Array.isArray(obj.items) &&
  obj.items.every(
    (item) =>
      typeof item.title    === "string" && item.title.trim() &&
      typeof item.category === "string" &&
      typeof item.amount   === "number" &&
      typeof item.reason   === "string" && item.reason.trim() &&
      PRIORITY_LEVELS.includes(item.priority)
  );

const VALIDATORS = {
  highestSpendingCategory: validateHighestCategory,
  monthlyTrend:            validateMonthlyTrend,
  frequentExpenses:        validateFrequentExpenses,
  unnecessaryExpenses:     validateUnnecessaryExpenses,
};

/**
 * Attempts to parse and validate a raw Gemini response.
 * Returns { parsed, valid } — never throws.
 */
const tryParse = (raw, validators) => {
  try {
    const parsed = JSON.parse(cleanJSON(raw));
    const sectionResults = {};
    let allValid = true;

    for (const [key, validate] of Object.entries(validators)) {
      const isValid = validate(parsed[key]);
      sectionResults[key] = isValid;
      if (!isValid) allValid = false;
    }

    return { parsed, sectionResults, allValid };
  } catch {
    return { parsed: null, sectionResults: {}, allValid: false };
  }
};

// ─── Full Analysis ────────────────────────────────────────────────────────────

/**
 * Runs the full 4-dimension spending pattern analysis.
 * Retries once on failure. On second failure, attempts per-section recovery.
 *
 * @param {Object} context - Pre-aggregated spending data
 * @returns {Promise<Object>} Validated analysis result
 */
const analyzePatterns = async (context) => {
  if (!context || typeof context !== "object") {
    throw ApiError.badRequest("Spending context data is required.");
  }

  const allValidators = { ...VALIDATORS };
  const prompt        = buildPatternPrompt(context);

  // ── Attempt 1 ────────────────────────────────────────────────────────────
  const raw1    = await generateText(prompt);
  const result1 = tryParse(raw1, allValidators);

  if (result1.allValid) {
    console.log("[PatternAnalyzerAgent] Full analysis succeeded on attempt 1.");
    return result1.parsed;
  }

  // ── Attempt 2 — retry with stricter instruction ───────────────────────────
  const retryPrompt = prompt + "\n\nCRITICAL: Return ONLY the raw JSON object. No text, no markdown, no code fences.";
  const raw2        = await generateText(retryPrompt);
  const result2     = tryParse(raw2, allValidators);

  if (result2.allValid) {
    console.log("[PatternAnalyzerAgent] Full analysis succeeded on attempt 2.");
    return result2.parsed;
  }

  // ── Partial recovery — re-run failed sections individually ───────────────
  console.warn("[PatternAnalyzerAgent] Full parse failed. Attempting per-section recovery.");

  const base    = result2.parsed || result1.parsed || {};
  const invalid = Object.entries(result2.sectionResults)
    .filter(([, valid]) => !valid)
    .map(([key]) => key);

  const recoveryResults = await Promise.allSettled(
    invalid.map(async (dimension) => {
      const dimPrompt = buildSingleDimensionPrompt(context, dimension);
      const dimRaw    = await generateText(dimPrompt);
      const { parsed } = tryParse(dimRaw, { [dimension]: VALIDATORS[dimension] });
      return { dimension, value: parsed?.[dimension] };
    })
  );

  const recovered = { ...base };
  let recoveredCount = 0;

  recoveryResults.forEach((r) => {
    if (r.status === "fulfilled" && r.value?.value) {
      recovered[r.value.dimension] = r.value.value;
      recoveredCount++;
    } else {
      const dim = invalid[recoveryResults.indexOf(r)];
      recovered[dim] = recovered[dim] || { error: "Analysis unavailable for this section.", fallback: true };
    }
  });

  console.log(`[PatternAnalyzerAgent] Recovered ${recoveredCount}/${invalid.length} failed sections.`);

  recovered.generatedAt            = new Date().toISOString();
  recovered.totalExpensesAnalyzed  = context.totalCount || 0;
  recovered.partialRecovery        = recoveredCount < invalid.length;

  return recovered;
};

// ─── Single Dimension Analysis ────────────────────────────────────────────────

/**
 * Analyzes a single dimension only.
 *
 * @param {Object} context
 * @param {string} dimension
 * @returns {Promise<Object>}
 */
const analyzeDimension = async (context, dimension) => {
  if (!VALIDATORS[dimension]) {
    throw ApiError.badRequest(
      `Invalid dimension. Must be one of: ${Object.keys(VALIDATORS).join(", ")}.`
    );
  }

  const prompt = buildSingleDimensionPrompt(context, dimension);

  // Attempt 1
  try {
    const raw    = await generateText(prompt);
    const parsed = JSON.parse(cleanJSON(raw));
    if (VALIDATORS[dimension](parsed[dimension])) {
      return { [dimension]: parsed[dimension], generatedAt: new Date().toISOString() };
    }
  } catch { /* fall through */ }

  // Attempt 2
  try {
    const raw    = await generateText(prompt + "\n\nReturn ONLY raw JSON. No markdown.");
    const parsed = JSON.parse(cleanJSON(raw));
    if (VALIDATORS[dimension](parsed[dimension])) {
      return { [dimension]: parsed[dimension], generatedAt: new Date().toISOString() };
    }
  } catch { /* fall through */ }

  throw ApiError.internal(`Failed to analyze dimension: ${dimension}.`);
};

export { analyzePatterns, analyzeDimension, VALIDATORS };
