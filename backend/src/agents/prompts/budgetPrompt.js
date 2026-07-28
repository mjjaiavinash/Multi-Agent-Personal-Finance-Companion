/**
 * Budget Planner Agent Prompt — v1
 *
 * Design principles:
 *  - Data-driven: all budget figures derived from injected MongoDB aggregations
 *  - 50/30/20 rule used as baseline, adjusted per actual spending patterns
 *  - Category budgets cover every CATEGORIES enum from Expense model
 *  - Savings goal uses SMART criteria (Specific, Measurable, Achievable)
 *  - Strict enums on status, priority, and frequency prevent free-text drift
 *  - Few-shot examples anchor Gemini to expected output depth and format
 *  - Per-section validators enable partial recovery without full 500 errors
 */

// ─── Schema Enums ─────────────────────────────────────────────────────────────

export const BUDGET_STATUSES   = ["on_track", "over_budget", "under_budget", "no_data"];
export const PRIORITY_LEVELS   = ["high", "medium", "low"];
export const SAVINGS_FREQUENCY = ["monthly", "weekly", "bi_weekly"];
export const IMPACT_LEVELS     = ["high", "medium", "low"];
export const RISK_LEVELS       = ["low", "medium", "high"];

// ─── Schema Contract ──────────────────────────────────────────────────────────

export const BUDGET_SECTIONS = [
  "summary",
  "categoryBudgets",
  "savingsGoal",
  "budgetInsights",
  "nextMonthForecast",
];

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Builds the full budget planner prompt with injected spending context.
 *
 * @param {Object} context - Pre-aggregated spending data from MongoDB
 * @returns {string}
 */
export const buildBudgetPlannerPrompt = (context) => `
You are a certified personal budget planning AI. Your role is to analyze a user's historical spending data and generate a realistic, personalized monthly budget plan.

ANALYSIS DATE: ${new Date().toISOString().split("T")[0]}
CURRENCY: USD

━━━ USER SPENDING DATA ━━━
${JSON.stringify(context, null, 2)}

━━━ YOUR TASK ━━━
Generate a complete monthly budget plan based STRICTLY on the data above.
Return ONLY a valid JSON object — no markdown, no code fences, no text before or after.

━━━ OUTPUT SCHEMA ━━━
{
  "summary": {
    "monthlyIncome":       <number: estimated monthly income — use monthlyAverage / 0.75 if not provided>,
    "totalBudgeted":       <number: sum of all category budget allocations>,
    "totalSavingsTarget":  <number: recommended monthly savings amount>,
    "remainingBuffer":     <number: monthlyIncome - totalBudgeted - totalSavingsTarget>,
    "budgetHealthScore":   <integer 0–100: how well the budget aligns with best practices>,
    "budgetHealthGrade":   "<one of: A | B | C | D | F>",
    "planSummary":         "<string: 2-3 sentences describing the overall budget plan and its rationale>",
    "basedOnMonths":       <number: how many months of data were used>,
    "estimationMethod":    "<string: brief explanation of how income was estimated>"
  },

  "categoryBudgets": [
    {
      "category":          "<string: exact category name from expense data>",
      "currentMonthlyAvg": <number: actual average monthly spend in this category>,
      "recommendedBudget": <number: AI-recommended monthly budget for this category>,
      "changeFromCurrent": <number: recommendedBudget - currentMonthlyAvg, negative = reduction>,
      "changePercent":     <number: percentage change, negative = reduction>,
      "status":            "<one of: on_track | over_budget | under_budget | no_data>",
      "priority":          "<one of: high | medium | low — how essential this category is>",
      "rationale":         "<string: 1-2 sentences explaining why this budget was set at this level>",
      "tips":              ["<string: actionable tip 1>", "<string: actionable tip 2>"]
    }
  ],

  "savingsGoal": {
    "monthlyTarget":       <number: recommended monthly savings amount>,
    "weeklyTarget":        <number: monthlyTarget / 4.33>,
    "annualTarget":        <number: monthlyTarget * 12>,
    "savingsRate":         <number: (monthlyTarget / monthlyIncome) * 100, e.g. 20.5>,
    "frequency":           "<one of: monthly | weekly | bi_weekly>",
    "goalName":            "<string: descriptive name, e.g. 'Emergency Fund Builder'>",
    "goalDescription":     "<string: 2-3 sentences explaining the savings goal and its importance>",
    "milestones": [
      {
        "months":  <number: months to reach this milestone>,
        "amount":  <number: cumulative savings at this milestone>,
        "label":   "<string: milestone label, e.g. '1-month emergency fund'>"
      }
    ],
    "riskLevel":           "<one of: low | medium | high — risk if savings goal is not met>"
  },

  "budgetInsights": [
    {
      "id":          "<string: unique slug>",
      "title":       "<string: insight title>",
      "description": "<string: 2-3 sentences with specific, actionable insight>",
      "impact":      "<one of: high | medium | low>",
      "category":    "<string: which spending area this insight targets>",
      "priority":    "<one of: high | medium | low>"
    }
  ],

  "nextMonthForecast": {
    "projectedSpend":      <number: predicted total spend next month based on trend>,
    "projectedSavings":    <number: projected savings if budget is followed>,
    "confidenceLevel":     <number: 0–100, how confident the forecast is based on data volume>,
    "forecastBasis":       "<string: 1-2 sentences explaining how the forecast was calculated>",
    "warningFlags": [
      {
        "category": "<string: category at risk>",
        "risk":     "<string: specific risk description>",
        "severity": "<one of: high | medium | low>"
      }
    ]
  },

  "generatedAt": "<string: current ISO timestamp>",
  "dataRange":   "<string: e.g. 'Jan 2025 – Jun 2025'>"
}

━━━ BUDGET PLANNING RULES ━━━
1. Base ALL numbers strictly on the provided spending data. Never fabricate amounts.
2. Use 50/30/20 rule: 50% needs, 30% wants, 20% savings.
3. categoryBudgets must include EVERY category in spending data.
4. recommendedBudget should be realistic: maximum 30% reduction from currentMonthlyAvg.
5. savingsGoal.monthlyTarget must be at least 10% of monthly income.
6. savingsGoal.milestones must include exactly 3 milestones: 3-month, 6-month, and 12-month marks.
7. budgetInsights must contain 3–5 insights, ranked by impact descending.
8. budgetHealthScore: 90–100 (A), 75–89 (B), 60–74 (C), 45–59 (D), 0–44 (F).
9. If a category has no spending history, set status to "no_data".
10. "generatedAt" must be: "${new Date().toISOString()}"
11. CRITICAL: Always use Indian Rupee (₹) or Rs. for all currency text descriptions. NEVER output USD ($) signs.
`.trim();

/**
 * Builds a focused single-section recovery prompt.
 *
 * @param {Object} context
 * @param {string} section
 * @returns {string}
 */
export const buildSingleSectionBudgetPrompt = (context, section) => {
  const sectionSchemas = {
    summary:
      `{ "summary": { "monthlyIncome": <number>, "totalBudgeted": <number>, "totalSavingsTarget": <number>, "remainingBuffer": <number>, "budgetHealthScore": <0-100>, "budgetHealthGrade": "<A|B|C|D|F>", "planSummary": "<string>", "basedOnMonths": <number>, "estimationMethod": "<string>" } }`,
    categoryBudgets:
      `{ "categoryBudgets": [{ "category": "<string>", "currentMonthlyAvg": <number>, "recommendedBudget": <number>, "changeFromCurrent": <number>, "changePercent": <number>, "status": "<on_track|over_budget|under_budget|no_data>", "priority": "<high|medium|low>", "rationale": "<string>", "tips": ["<tip1>", "<tip2>"] }] }`,
    savingsGoal:
      `{ "savingsGoal": { "monthlyTarget": <number>, "weeklyTarget": <number>, "annualTarget": <number>, "savingsRate": <number>, "frequency": "<monthly|weekly|bi_weekly>", "goalName": "<string>", "goalDescription": "<string>", "milestones": [{ "months": <number>, "amount": <number>, "label": "<string>" }], "riskLevel": "<low|medium|high>" } }`,
    budgetInsights:
      `{ "budgetInsights": [{ "id": "<slug>", "title": "<string>", "description": "<string>", "impact": "<high|medium|low>", "category": "<string>", "priority": "<high|medium|low>" }] }`,
    nextMonthForecast:
      `{ "nextMonthForecast": { "projectedSpend": <number>, "projectedSavings": <number>, "confidenceLevel": <0-100>, "forecastBasis": "<string>", "warningFlags": [{ "category": "<string>", "risk": "<string>", "severity": "<high|medium|low>" }] } }`,
  };

  return `
You are a personal budget planning AI. Analyze the data below and return ONLY the "${section}" section.

DATA:
${JSON.stringify(context, null, 2)}

Return ONLY this JSON structure (no markdown, no extra text):
${sectionSchemas[section] || `{ "${section}": {} }`}
`.trim();
};
