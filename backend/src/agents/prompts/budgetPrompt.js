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
2. Use the 50/30/20 rule as a starting framework: 50% needs, 30% wants, 20% savings — but ADJUST based on actual spending patterns.
3. categoryBudgets must include EVERY category present in the spending data.
4. recommendedBudget should be realistic: never more than 30% below currentMonthlyAvg unless the category is clearly discretionary.
5. savingsGoal.monthlyTarget must be at least 10% of estimated monthly income.
6. savingsGoal.milestones must include exactly 3 milestones: 3-month, 6-month, and 12-month marks.
7. budgetInsights must contain 3–5 insights, ranked by impact descending.
8. nextMonthForecast.projectedSpend must use linear trend from monthlyBreakdown data.
9. budgetHealthScore: 90–100 = excellent (A), 75–89 = good (B), 60–74 = fair (C), 45–59 = poor (D), 0–44 = critical (F).
10. If a category has no spending history, set status to "no_data" and set recommendedBudget to a reasonable default.
11. remainingBuffer should be positive; if negative, flag it in budgetInsights as a critical issue.
12. "generatedAt" must be: "${new Date().toISOString()}"

━━━ FEW-SHOT EXAMPLES ━━━

Example summary:
{
  "monthlyIncome": 4267,
  "totalBudgeted": 3200,
  "totalSavingsTarget": 640,
  "remainingBuffer": 427,
  "budgetHealthScore": 74,
  "budgetHealthGrade": "C",
  "planSummary": "Your budget plan is based on 6 months of spending history averaging $3,200/month. Food & Dining and Shopping are your two largest categories and have been allocated realistic reductions of 15% and 20% respectively. Following this plan would free up $640/month for savings.",
  "basedOnMonths": 6,
  "estimationMethod": "Monthly income estimated as monthlyAverage / 0.75 since no income data was provided."
}

Example categoryBudget item:
{
  "category": "Food & Dining",
  "currentMonthlyAvg": 620,
  "recommendedBudget": 480,
  "changeFromCurrent": -140,
  "changePercent": -22.6,
  "status": "over_budget",
  "priority": "high",
  "rationale": "Food & Dining represents 28% of your total spend, significantly above the recommended 15% for this income level. A $480 budget is achievable by reducing restaurant visits from 4x to 2x per week.",
  "tips": [
    "Meal prep 3 days per week to reduce weekday restaurant spending",
    "Set a $120/week food budget and track it daily in the app"
  ]
}

Example savingsGoal:
{
  "monthlyTarget": 640,
  "weeklyTarget": 147.81,
  "annualTarget": 7680,
  "savingsRate": 15.0,
  "frequency": "monthly",
  "goalName": "Emergency Fund Builder",
  "goalDescription": "Building a 3-month emergency fund is your most critical financial priority. At $640/month, you will reach a $1,920 safety net in 3 months and a full $7,680 annual savings in 12 months.",
  "milestones": [
    { "months": 3,  "amount": 1920,  "label": "1-month emergency fund" },
    { "months": 6,  "amount": 3840,  "label": "2-month emergency fund" },
    { "months": 12, "amount": 7680,  "label": "Full 3-month emergency fund" }
  ],
  "riskLevel": "high"
}

Example budgetInsight:
{
  "id": "food-overspend-alert",
  "title": "Food & Dining Consistently Over Budget",
  "description": "Your Food & Dining spend has exceeded $600 in 4 of the last 6 months. This single category is responsible for 28% of total spending. Reducing it by just $140/month would improve your budget health score by 8 points.",
  "impact": "high",
  "category": "Food & Dining",
  "priority": "high"
}

Example nextMonthForecast:
{
  "projectedSpend": 3380,
  "projectedSavings": 520,
  "confidenceLevel": 78,
  "forecastBasis": "Projection based on 6-month linear trend showing 2.1% monthly spending increase. Peak spending months (Nov-Dec) are excluded from the baseline.",
  "warningFlags": [
    {
      "category": "Shopping",
      "risk": "Shopping spend increased 34% last month — likely to remain elevated",
      "severity": "medium"
    }
  ]
}
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
