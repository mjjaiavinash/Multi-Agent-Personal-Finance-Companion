/**
 * Spending Pattern Analyzer Prompt — v1
 *
 * Design principles:
 *  - Each analysis dimension has its own schema definition to prevent field confusion
 *  - Pre-computed MongoDB aggregations are injected so Gemini does reasoning, not arithmetic
 *  - Few-shot examples per section anchor the expected depth of insight
 *  - Strict output contract with field-level type annotations
 *  - Trend direction uses an enum to prevent free-text drift
 */

// ─── Output Schema Contract ───────────────────────────────────────────────────

export const PATTERN_SCHEMA = {
  highestSpendingCategory: {
    required: ["category", "totalAmount", "percentage", "monthlyAverage", "insight", "trend"],
  },
  monthlyTrend: {
    required: ["direction", "changePercent", "peakMonth", "lowestMonth", "averageMonthly", "forecast", "insight"],
  },
  frequentExpenses: {
    required: ["items"],
    itemRequired: ["title", "frequency", "averageAmount", "totalAmount", "category", "insight"],
  },
  unnecessaryExpenses: {
    required: ["items", "totalWasted", "savingsPotential"],
    itemRequired: ["title", "category", "amount", "reason", "priority"],
  },
};

export const TREND_DIRECTIONS  = ["increasing", "decreasing", "stable", "volatile"];
export const PRIORITY_LEVELS   = ["high", "medium", "low"];

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Builds the full spending pattern analysis prompt.
 *
 * @param {Object} context - Pre-aggregated spending data from MongoDB
 * @param {string[]} [dimensions] - Which sections to analyze (defaults to all)
 * @returns {string}
 */
export const buildPatternPrompt = (context, dimensions = ["all"]) => {
  const analyzeAll = dimensions.includes("all");
  const include    = (dim) => analyzeAll || dimensions.includes(dim);

  return `
You are an expert personal finance analyst AI. You will analyze a user's spending data and return deep, actionable insights.

ANALYSIS DATE: ${new Date().toISOString().split("T")[0]}
CURRENCY: USD

━━━ USER SPENDING DATA ━━━
${JSON.stringify(context, null, 2)}

━━━ YOUR TASK ━━━
Analyze the data above and return a single JSON object. Use ONLY the data provided — do not invent numbers.
Return ONLY valid JSON — no markdown, no code fences, no explanation text before or after.

━━━ OUTPUT SCHEMA ━━━
{
${include("highestSpendingCategory") ? `
  "highestSpendingCategory": {
    "category":       "<string: the category with highest total spend>",
    "totalAmount":    <number: total spent in this category>,
    "percentage":     <number: percentage of total spend, e.g. 34.5>,
    "monthlyAverage": <number: average monthly spend in this category>,
    "trend":          "<one of: increasing | decreasing | stable | volatile>",
    "insight":        "<string: 2-3 sentences explaining why this is high and what it means>"
  },` : ""}
${include("monthlyTrend") ? `
  "monthlyTrend": {
    "direction":      "<one of: increasing | decreasing | stable | volatile>",
    "changePercent":  <number: % change from first to last month, negative means decrease>,
    "peakMonth":      "<string: month label with highest spend, e.g. 'Mar 2025'>",
    "lowestMonth":    "<string: month label with lowest spend>",
    "averageMonthly": <number: mean monthly spend across all months>,
    "forecast":       <number: predicted next month spend based on trend>,
    "insight":        "<string: 2-3 sentences describing the trend pattern and what is driving it>"
  },` : ""}
${include("frequentExpenses") ? `
  "frequentExpenses": {
    "items": [
      {
        "title":         "<string: expense title or pattern name>",
        "frequency":     <number: how many times this appears>,
        "averageAmount": <number: average amount per occurrence>,
        "totalAmount":   <number: total spent on this item>,
        "category":      "<string: category this belongs to>",
        "insight":       "<string: one sentence about this recurring expense>"
      }
    ]
  },` : ""}
${include("unnecessaryExpenses") ? `
  "unnecessaryExpenses": {
    "totalWasted":       <number: sum of all unnecessary expense amounts>,
    "savingsPotential":  <number: realistic monthly savings if these are cut>,
    "items": [
      {
        "title":    "<string: expense title>",
        "category": "<string: category>",
        "amount":   <number: amount spent>,
        "reason":   "<string: specific reason why this is considered unnecessary>",
        "priority": "<one of: high | medium | low — how urgently to cut this>"
      }
    ]
  },` : ""}
  "generatedAt": "<string: ISO timestamp>",
  "dataRange":   "<string: e.g. 'Jan 2025 – Jun 2025'>",
  "totalExpensesAnalyzed": <number>
}

━━━ ANALYSIS RULES ━━━
1. Base ALL numbers strictly on the provided data. Never fabricate amounts.
2. "unnecessaryExpenses" should flag: duplicate subscriptions, impulse purchases, luxury items bought frequently, overpriced recurring services.
3. "frequentExpenses" should surface items appearing 3+ times or with the same merchant/title pattern.
4. "forecast" in monthlyTrend must use linear extrapolation from the monthly data — show your logic in "insight".
5. "priority" in unnecessaryExpenses: "high" = easy to cut with big savings, "medium" = moderate effort/savings, "low" = minor or lifestyle choice.
6. If a section has no meaningful data (e.g. only 1 month of data for trend), still return the field but set "insight" to explain the limitation.
7. "generatedAt" must be the current ISO timestamp: "${new Date().toISOString()}"

━━━ FEW-SHOT EXAMPLES ━━━

Example highestSpendingCategory:
{
  "category": "Food & Dining",
  "totalAmount": 1240.50,
  "percentage": 38.2,
  "monthlyAverage": 206.75,
  "trend": "increasing",
  "insight": "Food & Dining accounts for over a third of total spending and has grown 12% over the last 3 months. This is likely driven by frequent restaurant visits and food delivery orders, which average $18 per transaction."
}

Example monthlyTrend:
{
  "direction": "increasing",
  "changePercent": 23.4,
  "peakMonth": "May 2025",
  "lowestMonth": "Feb 2025",
  "averageMonthly": 842.30,
  "forecast": 1020.00,
  "insight": "Spending has increased 23.4% from February to May 2025, with a consistent upward trajectory. The peak in May correlates with higher Entertainment and Shopping expenses. If the current trend continues, next month's spend is projected at $1,020."
}

Example frequentExpenses item:
{
  "title": "Starbucks",
  "frequency": 18,
  "averageAmount": 6.80,
  "totalAmount": 122.40,
  "category": "Food & Dining",
  "insight": "Visited 18 times this period, averaging $6.80 per visit — a daily coffee habit costing $122 total."
}

Example unnecessaryExpenses item:
{
  "title": "Spotify Premium",
  "category": "Bills & Utilities",
  "amount": 47.97,
  "reason": "3 separate Spotify charges detected — possible duplicate subscriptions on different accounts.",
  "priority": "high"
}
`.trim();
};

/**
 * Builds a prompt for a single analysis dimension only.
 *
 * @param {Object} context
 * @param {string} dimension - One of: highestSpendingCategory | monthlyTrend | frequentExpenses | unnecessaryExpenses
 * @returns {string}
 */
export const buildSingleDimensionPrompt = (context, dimension) =>
  buildPatternPrompt(context, [dimension]);
