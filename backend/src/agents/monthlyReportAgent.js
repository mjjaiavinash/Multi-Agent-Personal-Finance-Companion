import { generateText }             from "../services/groqService.js";
import { buildMonthlyReportPrompt } from "./prompts/monthlyReportPrompt.js";

const cleanJSON = (raw) => raw.replace(/```json|```/gi, "").trim();
const safeParse = (raw) => { try { return JSON.parse(cleanJSON(raw)); } catch { return null; } };

// ─── Section validators ───────────────────────────────────────────────────────

const validateSummary = (o) =>
  o && typeof o.overview === "string" && o.overview.trim() &&
  typeof o.keyTakeaway === "string";

const validateCategoryInsights = (arr) =>
  Array.isArray(arr) && arr.length > 0 &&
  arr.every((c) => typeof c.category === "string" && typeof c.insight === "string");

const validateBudgetPerformance = (o) =>
  o && typeof o.score === "number" && o.score >= 0 && o.score <= 100 &&
  ["A","B","C","D","F"].includes(o.grade) && typeof o.summary === "string";

const validateHealthScore = (o) =>
  o && typeof o.score === "number" && o.score >= 0 && o.score <= 100 &&
  ["Excellent","Good","Average","Poor"].includes(o.grade);

const validateWeeklyInsights = (arr) =>
  Array.isArray(arr) && arr.length > 0 &&
  arr.every((w) => typeof w.week === "string" && typeof w.insight === "string");

const validateSpendingTrends = (o) =>
  o && ["increasing","decreasing","stable","volatile"].includes(o.direction) &&
  typeof o.insight === "string";

const validateAIRecommendations = (o) =>
  o && typeof o.executiveSummary === "string" &&
  Array.isArray(o.immediateActions) && o.immediateActions.length >= 1 &&
  Array.isArray(o.savingsOpportunities) &&
  Array.isArray(o.nextMonthGoals);

const VALIDATORS = {
  summary:            validateSummary,
  categoryInsights:   validateCategoryInsights,
  budgetPerformance:  validateBudgetPerformance,
  healthScore:        validateHealthScore,
  weeklyInsights:     validateWeeklyInsights,
  spendingTrends:     validateSpendingTrends,
  aiRecommendations:  validateAIRecommendations,
};

// ─── Fallbacks ────────────────────────────────────────────────────────────────

const buildFallbacks = (ctx) => ({
  summary: {
    overview:         `You spent ₹${ctx.totalExpenses} across ${ctx.transactionCount} transactions in ${ctx.reportMonthLabel}.`,
    mostExpensiveDay: "N/A",
    keyTakeaway:      "Review your spending patterns to identify savings opportunities.",
  },
  categoryInsights: (ctx.categoryBreakdown || []).map((c) => ({
    category:       c.category,
    trend:          "stable",
    insight:        `You spent ₹${c.total} on ${c.category} this month.`,
    recommendation: "Monitor this category closely.",
  })),
  budgetPerformance: {
    score: 50, grade: "C",
    summary: "Budget performance analysis unavailable. Please regenerate.",
    topOverspendCategory: null, topUnderspendCategory: null,
  },
  healthScore: {
    score: 50, grade: "Average",
    summary: "Financial health analysis unavailable. Please regenerate.",
  },
  weeklyInsights: (ctx.weeklyData || []).map((w) => ({
    week:         w.week,
    insight:      `You spent ₹${w.totalSpent} this week.`,
    standoutFact: `${w.txCount} transactions recorded.`,
  })),
  spendingTrends: {
    direction: "stable", peakDay: "N/A", peakWeek: "Week 1",
    consistencyScore: 50,
    insight: "Spending trend analysis unavailable. Please regenerate.",
  },
  aiRecommendations: {
    executiveSummary:       `Monthly report for ${ctx.reportMonthLabel}. Total spend: ₹${ctx.totalExpenses}.`,
    immediateActions:       [{ rank: 1, action: "Review your top spending categories.", impact: "high", estimatedSaving: 0 }],
    savingsOpportunities:   [{ title: "Track daily expenses", description: "Log every expense to identify leaks.", estimatedSaving: 0, difficulty: "easy" }],
    positiveHighlights:     ["You are actively tracking your finances."],
    riskAlerts:             [],
    nextMonthGoals:         ["Set a monthly budget", "Reduce top spending category by 10%", "Save at least 20% of income"],
    financialHealthSummary: "Keep tracking your expenses to improve your financial health.",
  },
});

// ─── Parse & validate ─────────────────────────────────────────────────────────

const parseAndValidate = (raw) => {
  const parsed = safeParse(raw);
  if (!parsed) return { parsed: null, results: {}, allValid: false };

  const results = {};
  let allValid = true;
  for (const [key, validate] of Object.entries(VALIDATORS)) {
    results[key] = validate(parsed[key]);
    if (!results[key]) allValid = false;
  }
  return { parsed, results, allValid };
};

// ─── Main agent ───────────────────────────────────────────────────────────────

/**
 * Generates a complete monthly financial report using Groq.
 * 3-attempt strategy: full → retry → per-section recovery → fallback.
 *
 * @param {Object} ctx - Pre-aggregated monthly context
 * @returns {Promise<Object>}
 */
const generateMonthlyReport = async (ctx) => {
  const prompt = buildMonthlyReportPrompt(ctx);

  // Attempt 1
  const r1 = parseAndValidate(await generateText(prompt, { temperature: 0.3, maxTokens: 4096 }));
  if (r1.allValid) {
    console.log("[MonthlyReportAgent] Succeeded on attempt 1.");
    return r1.parsed;
  }

  // Attempt 2 — stricter JSON reminder
  const r2 = parseAndValidate(
    await generateText(
      prompt + "\n\nCRITICAL: Return ONLY raw JSON. No markdown, no code fences, no text outside the JSON object.",
      { temperature: 0.2, maxTokens: 4096 }
    )
  );
  if (r2.allValid) {
    console.log("[MonthlyReportAgent] Succeeded on attempt 2.");
    return r2.parsed;
  }

  // Attempt 3 — per-section recovery
  console.warn("[MonthlyReportAgent] Full parse failed. Attempting per-section recovery.");
  const base     = r2.parsed || r1.parsed || {};
  const fallbacks = buildFallbacks(ctx);
  const failed   = Object.entries(r2.results).filter(([, v]) => !v).map(([k]) => k);

  const recoveries = await Promise.allSettled(
    failed.map(async (section) => {
      const sectionPrompt = `
You are a finance AI. Return ONLY the "${section}" section as a JSON object.
Context: ${JSON.stringify(ctx, null, 2)}
Return ONLY: { "${section}": <value> }
No markdown, no extra text.`.trim();
      const raw    = await generateText(sectionPrompt, { temperature: 0.2, maxTokens: 1024 });
      const parsed = safeParse(raw);
      return { section, value: parsed?.[section] && VALIDATORS[section](parsed[section]) ? parsed[section] : null };
    })
  );

  const result = { ...base };
  recoveries.forEach((r) => {
    if (r.status === "fulfilled" && r.value?.value) {
      result[r.value.section] = r.value.value;
    } else {
      const sec = failed[recoveries.indexOf(r)];
      if (!result[sec] || !VALIDATORS[sec](result[sec])) result[sec] = fallbacks[sec];
    }
  });

  console.log("[MonthlyReportAgent] Recovery complete.");
  return result;
};

export { generateMonthlyReport };
