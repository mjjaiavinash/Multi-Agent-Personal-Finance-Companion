import { categorizeBatch }      from "./categorizerAgent.js";
import { analyzePatterns }      from "./patternAnalyzerAgent.js";
import { generateSavingsAdvice } from "./savingsAdvisorAgent.js";
import { generateBudgetPlan }   from "./budgetPlannerAgent.js";
import { generateText }         from "../services/groqService.js";
import OrchestratorLogger       from "../utils/OrchestratorLogger.js";

// ─── Stage Fallbacks ──────────────────────────────────────────────────────────
// Each stage has a typed fallback so the response shape is always consistent
// regardless of which stages failed. The frontend can check `stage.status`
// to decide whether to render the data or show a retry prompt.

const STAGE_FALLBACKS = {
  categorizer: {
    status:  "failed",
    results: [],
    summary: { processed: 0, updated: 0, skipped: 0 },
  },
  patterns: {
    status:                  "failed",
    highestSpendingCategory: null,
    monthlyTrend:            null,
    frequentExpenses:        null,
    unnecessaryExpenses:     null,
  },
  savings: {
    status:                 "failed",
    overview:               null,
    savingsSuggestions:     [],
    monthlySavingsEstimate: null,
    financialImprovements:  [],
    actionPlan:             null,
  },
  budget: {
    status:           "failed",
    summary:          null,
    categoryBudgets:  [],
    savingsGoal:      null,
    budgetInsights:   [],
    nextMonthForecast: null,
  },
  assistant: {
    status:  "failed",
    summary: "Financial synthesis unavailable. Individual stage results are still available above.",
    keyInsights:      [],
    immediateActions: [],
    financialScore:   null,
  },
};

// ─── Stage 5: Finance Assistant Synthesis ────────────────────────────────────

/**
 * Builds a synthesis prompt that asks Gemini to act as a senior financial
 * advisor reviewing all 4 prior stage outputs and producing a unified summary.
 *
 * This is the "intelligence layer" of the orchestrator — it doesn't just
 * concatenate results, it reasons across them to find cross-stage insights
 * (e.g. "your top spending category from patterns matches the highest-impact
 * savings suggestion").
 *
 * @param {Object} stageResults - Results from stages 1–4
 * @param {Object} spendingContext - Raw spending data for grounding
 * @returns {string}
 */
const buildSynthesisPrompt = (stageResults, spendingContext) => `
You are a senior personal finance advisor AI. You have just completed a full financial analysis pipeline for a user. Your job is to synthesize all findings into a single, unified financial health report.

━━━ PIPELINE RESULTS ━━━

STAGE 1 — EXPENSE CATEGORIZATION:
${JSON.stringify(stageResults.categorizer, null, 2)}

STAGE 2 — SPENDING PATTERN ANALYSIS:
${JSON.stringify(stageResults.patterns, null, 2)}

STAGE 3 — SAVINGS ADVISORY:
${JSON.stringify(stageResults.savings, null, 2)}

STAGE 4 — BUDGET PLAN:
${JSON.stringify(stageResults.budget, null, 2)}

━━━ RAW SPENDING CONTEXT ━━━
${JSON.stringify(spendingContext, null, 2)}

━━━ YOUR TASK ━━━
Synthesize all findings above into a unified financial health report.
Return ONLY a valid JSON object — no markdown, no code fences, no text before or after.

━━━ OUTPUT SCHEMA ━━━
{
  "financialScore": {
    "overall":     <integer 0–100: composite financial health score>,
    "grade":       "<one of: A | B | C | D | F>",
    "breakdown": {
      "spending":  <integer 0–100: spending discipline score>,
      "savings":   <integer 0–100: savings rate score>,
      "budgeting": <integer 0–100: budget adherence score>,
      "habits":    <integer 0–100: financial habit score>
    }
  },
  "executiveSummary": "<string: 3-4 sentences synthesizing the most important findings across all stages>",
  "keyInsights": [
    {
      "id":          "<string: unique slug>",
      "title":       "<string: insight title>",
      "description": "<string: 2 sentences — specific, data-driven, cross-stage insight>",
      "sourceStages": ["<stage name>"],
      "priority":    "<one of: critical | high | medium | low>",
      "impact":      "<one of: high | medium | low>"
    }
  ],
  "immediateActions": [
    {
      "rank":        <integer: 1 = most urgent>,
      "action":      "<string: specific, measurable action the user should take this week>",
      "expectedSaving": <number: estimated monthly saving from this action>,
      "effort":      "<one of: low | medium | high>",
      "sourceStage": "<string: which stage identified this>"
    }
  ],
  "crossStageCorrelations": [
    {
      "finding":     "<string: a pattern that appears across multiple stages>",
      "stages":      ["<stage1>", "<stage2>"],
      "significance":"<string: why this cross-stage correlation matters>"
    }
  ],
  "thirtyDayPlan": "<string: 2-3 sentences describing the single most impactful thing the user should focus on in the next 30 days>",
  "generatedAt":   "<string: current ISO timestamp>"
}

━━━ SYNTHESIS RULES ━━━
1. Base ALL numbers strictly on the pipeline results above. Never fabricate figures.
2. keyInsights must contain 3–5 insights, ranked by priority (critical first).
3. immediateActions must contain 3–5 actions, ranked by rank ascending (1 = most urgent).
4. crossStageCorrelations must identify at least 1 pattern that spans multiple stages.
5. financialScore.overall = weighted average: spending(30%) + savings(30%) + budgeting(25%) + habits(15%).
6. If a stage failed (status: "failed"), note it in executiveSummary but still synthesize from available data.
7. "generatedAt" must be: "${new Date().toISOString()}"
`.trim();

/**
 * Parses and validates the synthesis response from Gemini.
 * Returns a structured fallback if parsing fails.
 *
 * @param {string} raw
 * @returns {Object}
 */
const parseSynthesis = (raw) => {
  try {
    const cleaned = raw.replace(/```json|```/gi, "").trim();
    const parsed  = JSON.parse(cleaned);

    // Minimal validation — ensure required top-level keys exist
    if (
      parsed &&
      typeof parsed.executiveSummary === "string" &&
      Array.isArray(parsed.keyInsights) &&
      Array.isArray(parsed.immediateActions)
    ) {
      return { ...parsed, status: "success" };
    }
  } catch {
    // Fall through to fallback
  }

  return STAGE_FALLBACKS.assistant;
};

// ─── Core Orchestrator ────────────────────────────────────────────────────────

/**
 * Runs the full 5-stage AI analysis pipeline.
 *
 * Pipeline:
 *   Stage 1: Expense Categorizer    — classifies raw expenses into categories
 *   Stage 2: Pattern Analyzer       — identifies spending patterns and trends
 *   Stage 3: Savings Advisor        — generates personalized savings advice
 *   Stage 4: Budget Planner         — creates a category-wise monthly budget
 *   Stage 5: Finance Assistant      — synthesizes all results into a unified report
 *
 * Failure isolation:
 *   Each stage runs in its own try/catch. A failure in any stage:
 *   - Is logged with full error details
 *   - Produces a typed fallback result for that stage
 *   - Does NOT abort subsequent stages (they run with whatever data is available)
 *
 * Context threading:
 *   Stage 1 output (categorized expenses) enriches the spendingContext
 *   passed to stages 2–4. Stage 5 receives all prior results.
 *
 * @param {Array}  expenses       - Raw expenses to categorize in stage 1
 * @param {Object} spendingContext - Pre-aggregated MongoDB data for stages 2–4
 * @param {string} userId         - For logging purposes
 * @returns {Promise<Object>}     - Full pipeline result with executionLog
 */
const runOrchestrator = async (expenses, spendingContext, userId) => {
  const logger  = new OrchestratorLogger();
  const results = {};

  console.log(`\n[Orchestrator] ═══ Pipeline started for user ${userId} ═══`);
  console.log(`[Orchestrator] Expenses to process: ${expenses?.length ?? 0}`);

  // ── Stage 1: Expense Categorizer ─────────────────────────────────────────
  logger.start("categorizer");
  try {
    // Only run categorizer if there are expenses to process
    if (Array.isArray(expenses) && expenses.length > 0) {
      const categorized = await categorizeBatch(expenses);

      // Compute a quick summary for the synthesis stage
      const updated = categorized.filter((r) => !r.fallback).length;
      const skipped = categorized.filter((r) =>  r.fallback).length;

      results.categorizer = {
        status:  "success",
        results: categorized,
        summary: {
          processed: categorized.length,
          updated,
          skipped,
          avgConfidence: categorized.length > 0
            ? Math.round(
                (categorized.reduce((sum, r) => sum + (r.confidence || 0), 0) / categorized.length) * 100
              ) / 100
            : 0,
        },
      };

      // Thread categorized categories back into spendingContext so
      // downstream stages have the most accurate category data
      spendingContext.categorizerOutput = results.categorizer.summary;
    } else {
      // No expenses provided — skip categorization but don't fail
      logger.skip("categorizer", "No expenses provided for categorization.");
      results.categorizer = {
        status:  "skipped",
        results: [],
        summary: { processed: 0, updated: 0, skipped: 0, avgConfidence: 0 },
      };
    }

    if (results.categorizer.status === "success") logger.complete("categorizer");
  } catch (err) {
    logger.fail("categorizer", err);
    results.categorizer = { ...STAGE_FALLBACKS.categorizer, error: err.message };
  }

  // ── Stages 2, 3, 4: Run in parallel (independent of each other) ──────────
  const hasData = spendingContext && spendingContext.totalCount > 0;

  logger.start("patterns");
  logger.start("savings");
  logger.start("budget");

  const [patternRes, savingsRes, budgetRes] = await Promise.allSettled([
    // Stage 2: Pattern Analyzer
    hasData
      ? analyzePatterns(spendingContext)
      : Promise.resolve(null),

    // Stage 3: Savings Advisor
    hasData
      ? generateSavingsAdvice(buildSavingsContext(spendingContext))
      : Promise.resolve(null),

    // Stage 4: Budget Planner
    hasData
      ? generateBudgetPlan(buildBudgetContext(spendingContext))
      : Promise.resolve(null),
  ]);

  // Patterns
  if (!hasData) {
    logger.skip("patterns", "Insufficient spending data.");
    results.patterns = { status: "skipped", reason: "No spending data available.", ...STAGE_FALLBACKS.patterns };
  } else if (patternRes.status === "fulfilled") {
    results.patterns = { status: "success", ...patternRes.value };
    logger.complete("patterns");
  } else {
    logger.fail("patterns", patternRes.reason);
    results.patterns = { ...STAGE_FALLBACKS.patterns, error: patternRes.reason?.message };
  }

  // Savings
  if (!hasData) {
    logger.skip("savings", "Insufficient spending data.");
    results.savings = { status: "skipped", reason: "No spending data available.", ...STAGE_FALLBACKS.savings };
  } else if (savingsRes.status === "fulfilled") {
    results.savings = { status: "success", ...savingsRes.value };
    logger.complete("savings");
  } else {
    logger.fail("savings", savingsRes.reason);
    results.savings = { ...STAGE_FALLBACKS.savings, error: savingsRes.reason?.message };
  }

  // Budget
  if (!hasData) {
    logger.skip("budget", "Insufficient spending data.");
    results.budget = { status: "skipped", reason: "No spending data available.", ...STAGE_FALLBACKS.budget };
  } else if (budgetRes.status === "fulfilled") {
    results.budget = { status: "success", ...budgetRes.value };
    logger.complete("budget");
  } else {
    logger.fail("budget", budgetRes.reason);
    results.budget = { ...STAGE_FALLBACKS.budget, error: budgetRes.reason?.message };
  }

  // ── Stage 5: Finance Assistant Synthesis ─────────────────────────────────
  // Runs regardless of prior stage failures — synthesizes whatever is available
  logger.start("assistant");
  try {
    const synthesisPrompt  = buildSynthesisPrompt(results, spendingContext);
    const synthesisRaw     = await generateText(synthesisPrompt);
    const synthesisResult  = parseSynthesis(synthesisRaw);

    results.assistant = synthesisResult;

    if (synthesisResult.status === "success") {
      logger.complete("assistant");
    } else {
      logger.fail("assistant", new Error("Synthesis parse failed — using fallback."));
    }
  } catch (err) {
    logger.fail("assistant", err);
    results.assistant = { ...STAGE_FALLBACKS.assistant, error: err.message };
  }

  // ── Assemble Final Response ───────────────────────────────────────────────
  const executionLog     = logger.getLog();
  const pipelineStatus   = logger.getPipelineStatus();

  console.log(`[Orchestrator] ═══ Pipeline completed — status: ${pipelineStatus} ═══\n`);

  return {
    pipelineStatus,
    pipeline: {
      categorizer: results.categorizer,
      patterns:    results.patterns,
      savings:     results.savings,
      budget:      results.budget,
      assistant:   results.assistant,
    },
    // Top-level shortcuts for the most commonly accessed fields
    summary: {
      executiveSummary:        results.assistant?.executiveSummary     ?? null,
      financialScore:          results.assistant?.financialScore        ?? null,
      keyInsights:             results.assistant?.keyInsights           ?? [],
      immediateActions:        results.assistant?.immediateActions      ?? [],
      crossStageCorrelations:  results.assistant?.crossStageCorrelations ?? [],
      thirtyDayPlan:           results.assistant?.thirtyDayPlan         ?? null,
    },
    executionLog,
    meta: {
      userId,
      generatedAt:      new Date().toISOString(),
      expensesProcessed: expenses?.length ?? 0,
      stagesRun:         executionLog.pipeline.totalStages,
      stagesSucceeded:   executionLog.pipeline.successCount,
      stagesFailed:      executionLog.pipeline.failedCount,
      stagesSkipped:     executionLog.pipeline.skippedCount,
      totalDurationMs:   executionLog.pipeline.totalDurationMs,
    },
  };
};

// ─── Context Adapters ─────────────────────────────────────────────────────────
// The savings and budget agents were designed to receive context from their
// own service-layer pipelines. These adapters reshape the orchestrator's
// unified spendingContext into the exact shape each agent expects,
// without duplicating MongoDB queries.

/**
 * Reshapes the orchestrator's spendingContext into the shape
 * that savingsAdvisorAgent's buildSavingsAdvisorPrompt expects.
 *
 * @param {Object} ctx - Orchestrator spending context
 * @returns {Object}
 */
const buildSavingsContext = (ctx) => ({
  analysisRange:        ctx.analysisRange,
  financialSummary: {
    totalSpent:          ctx.totals?.totalSpent        ?? 0,
    transactionCount:    ctx.totalCount               ?? 0,
    monthlyAverage:      ctx.totals?.avgAmount         ?? 0,
    largestTransaction:  ctx.totals?.maxAmount         ?? 0,
    lastMonthSpend:      ctx.monthlyBreakdown?.[ctx.monthlyBreakdown.length - 1]?.totalSpent ?? 0,
    trendVsPriorMonths:  0,
  },
  categoryBreakdown:    ctx.categoryBreakdown   ?? [],
  topSpendingCategories:(ctx.categoryBreakdown  ?? []).slice(0, 3),
  monthlyTrend:         ctx.monthlyBreakdown    ?? [],
  recurringExpenses:    ctx.frequentExpenses    ?? [],
  totalCount:           ctx.totalCount          ?? 0,
});

/**
 * Reshapes the orchestrator's spendingContext into the shape
 * that budgetPlannerAgent's buildBudgetPlannerPrompt expects.
 *
 * @param {Object} ctx - Orchestrator spending context
 * @returns {Object}
 */
const buildBudgetContext = (ctx) => {
  const lastMonth  = ctx.monthlyBreakdown?.[ctx.monthlyBreakdown.length - 1]?.totalSpent ?? 0;
  const priorMonths = (ctx.monthlyBreakdown ?? []).slice(0, -1);
  const priorAvg   = priorMonths.length > 0
    ? priorMonths.reduce((s, m) => s + (m.totalSpent || 0), 0) / priorMonths.length
    : 0;

  // Build fixed cost floor per category from frequent expenses
  const fixedCostByCategory = (ctx.frequentExpenses ?? []).reduce((acc, item) => {
    if (item.category) {
      acc[item.category] = (acc[item.category] || 0) + (item.avg || 0);
    }
    return acc;
  }, {});

  return {
    analysisRange:    ctx.analysisRange,
    spendingSummary: {
      totalSpent:       ctx.totals?.totalSpent   ?? 0,
      transactionCount: ctx.totalCount           ?? 0,
      monthlyAverage:   ctx.totals?.avgAmount    ?? 0,
      largestSingle:    ctx.totals?.maxAmount    ?? 0,
      lastMonthSpend:   lastMonth,
      trendVsPrior:     priorAvg > 0
        ? Math.round(((lastMonth - priorAvg) / priorAvg) * 1000) / 10
        : 0,
    },
    categoryBreakdown:  ctx.categoryBreakdown ?? [],
    monthlyBreakdown:   ctx.monthlyBreakdown  ?? [],
    recurringCosts:     ctx.frequentExpenses  ?? [],
    fixedCostByCategory,
    totalCount:         ctx.totalCount        ?? 0,
  };
};

export { runOrchestrator };
