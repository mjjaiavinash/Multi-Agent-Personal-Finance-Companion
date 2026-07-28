/**
 * Builds the AI spending prediction prompt for Groq.
 *
 * @param {Object} ctx - Context object containing historical aggregations
 * @returns {string}
 */
export const buildPredictionPrompt = (ctx) => `
You are a senior financial analyst and predictive modeling AI.
Analyze the user's historical expense data and generate accurate spending forecasts for next week and next month.

━━━ HISTORICAL EXPENSE CONTEXT ━━━
- Analysis Period: ${ctx.months} months (${ctx.historyStartDate} to ${ctx.historyEndDate})
- Total Historical Expenses: ₹${ctx.totalSpent} across ${ctx.totalTransactions} transactions
- Average Weekly Spend: ₹${ctx.avgWeeklySpend}
- Average Monthly Spend: ₹${ctx.avgMonthlySpend}
- User Monthly Income: ₹${ctx.monthlyIncome}
- User Monthly Budget Target: ₹${ctx.monthlyBudget}

CATEGORY HISTORICAL TOTALS & WEEKLY AVERAGES:
${ctx.categoryData.map((c) => `  - ${c.category}: Total ₹${c.total} (${c.count} txns, Avg per week: ₹${c.weeklyAvg})`).join("\n")}

RECENT WEEKLY SPENDING TREND (Past 4 Weeks):
${ctx.past4Weeks.map((w) => `  - ${w.weekLabel}: ₹${w.total} (${w.count} txns)`).join("\n")}

DAY OF WEEK PATTERN:
${ctx.dailyPattern.map((d) => `  - ${d.day}: Avg ₹${d.avgSpend}`).join("\n")}

━━━ OUTPUT REQUIREMENTS ━━━
Return ONLY a valid JSON object matching this exact schema — no markdown, no code fences, no extra text.

{
  "confidenceScore": <integer 0-100 reflecting model confidence based on data consistency>,
  "confidenceLevel": "<High|Medium|Low>",
  "nextWeekExpense": {
    "predictedAmount": <number rounded to 2 decimals>,
    "changeVsAvgPercent": <number % change vs avg weekly spend>,
    "trendDirection": "<increasing|decreasing|stable>",
    "explanation": "<2 sentence explanation of next week forecast>"
  },
  "nextMonthExpense": {
    "predictedAmount": <number rounded to 2 decimals>,
    "changeVsAvgPercent": <number % change vs avg monthly spend>,
    "trendDirection": "<increasing|decreasing|stable>",
    "explanation": "<2 sentence explanation of next month forecast>"
  },
  "highestSpendingCategory": {
    "category": "<category name predicted to be highest>",
    "predictedAmount": <number>,
    "sharePercent": <number % of total predicted next month spend>,
    "reasoning": "<1 sentence reasoning for why this category will peak>"
  },
  "savingsForecast": {
    "projectedSavings": <number: monthlyIncome - predictedNextMonthAmount>,
    "projectedSavingsRate": <number: percentage of monthlyIncome>,
    "status": "<On Track|At Risk|Critical>",
    "insight": "<2 sentence summary of savings outlook>"
  },
  "budgetForecast": {
    "budgetTarget": <number>,
    "predictedSpent": <number>,
    "projectedVariance": <number: budgetTarget - predictedSpent>,
    "status": "<Within Budget|Slight Overspend|Severe Overspend>",
    "insight": "<2 sentence summary of budget forecast>"
  },
  "categoryForecasts": [
    {
      "category": "<category name>",
      "historicalWeeklyAvg": <number>,
      "predictedNextMonth": <number>,
      "projectedTrend": "<increasing|decreasing|stable>",
      "actionTip": "<1 actionable tip for this category>"
    }
  ],
  "forecastSeries": [
    // Provide 8 data points: 4 past weeks + 4 future predicted weeks
    { "period": "W-3", "actual": <number or null>, "predicted": <number>, "isForecast": false },
    { "period": "W-2", "actual": <number or null>, "predicted": <number>, "isForecast": false },
    { "period": "W-1", "actual": <number or null>, "predicted": <number>, "isForecast": false },
    { "period": "Current", "actual": <number or null>, "predicted": <number>, "isForecast": false },
    { "period": "Next Wk", "actual": null, "predicted": <number>, "isForecast": true },
    { "period": "Wk +2", "actual": null, "predicted": <number>, "isForecast": true },
    { "period": "Wk +3", "actual": null, "predicted": <number>, "isForecast": true },
    { "period": "Wk +4", "actual": null, "predicted": <number>, "isForecast": true }
  ],
  "keyDrivers": [
    "<key driver or risk factor 1>",
    "<key driver or risk factor 2>",
    "<key driver or risk factor 3>"
  ],
  "preventiveRecommendations": [
    "<actionable advice 1>",
    "<actionable advice 2>",
    "<actionable advice 3>"
  ]
}

RULES:
1. All amounts must be positive numbers strictly based on historical baselines and realistic trend logic.
2. Use ₹ symbol in text explanations.
3. Keep JSON keys exact as shown.
`.trim();
