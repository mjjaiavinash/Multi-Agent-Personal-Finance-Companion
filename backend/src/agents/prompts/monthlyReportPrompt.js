/**
 * Builds the full monthly report prompt for Groq.
 * Returns a single structured JSON with all report sections.
 *
 * @param {Object} ctx - Pre-aggregated monthly context from the service layer
 * @returns {string}
 */
export const buildMonthlyReportPrompt = (ctx) => `
You are a senior personal finance advisor AI. Generate a comprehensive monthly financial report for ${ctx.reportMonthLabel}.

━━━ FINANCIAL DATA ━━━

MONTHLY SUMMARY:
- Report Month: ${ctx.reportMonthLabel}
- Total Expenses: ₹${ctx.totalExpenses}
- Transaction Count: ${ctx.transactionCount}
- Avg Daily Spend: ₹${ctx.avgDailySpend}
- Highest Single Expense: ₹${ctx.highestExpense?.amount || 0} (${ctx.highestExpense?.title || "N/A"} — ${ctx.highestExpense?.category || "N/A"})
- Lowest Single Expense: ₹${ctx.lowestExpense?.amount || 0} (${ctx.lowestExpense?.title || "N/A"} — ${ctx.lowestExpense?.category || "N/A"})
- Monthly Income (user-provided): ₹${ctx.monthlyIncome || 0}
- Net Savings: ₹${ctx.netSavings || 0}
- Savings Rate: ${ctx.savingsRate?.toFixed(1) || 0}%

CATEGORY BREAKDOWN:
${ctx.categoryBreakdown.map((c) => `  - ${c.category}: ₹${c.total} (${c.count} txns, ${c.percentage}% of total, vs last month: ${c.vsLastMonth > 0 ? "+" : ""}${c.vsLastMonth}%)`).join("\n")}

WEEKLY BREAKDOWN:
${ctx.weeklyData.map((w) => `  - ${w.week}: ₹${w.totalSpent} across ${w.txCount} transactions (top: ${w.topCategory})`).join("\n")}

LAST MONTH COMPARISON:
- Last Month Total: ₹${ctx.lastMonthTotal || 0}
- Change: ${ctx.monthOverMonthChange > 0 ? "+" : ""}${ctx.monthOverMonthChange?.toFixed(1) || 0}%

DAILY SPENDING PATTERN:
${ctx.dailyPattern.map((d) => `  - ${d.day}: ₹${d.avgSpend}`).join("\n")}

HEALTH SCORE COMPONENTS:
- Savings Rate Score: ${ctx.healthComponents?.savingsRate || 0}/100
- Budget Adherence Score: ${ctx.healthComponents?.budgetAdherence || 0}/100
- Spending Consistency Score: ${ctx.healthComponents?.spendingConsistency || 0}/100
- Expense/Income Score: ${ctx.healthComponents?.expenseToIncome || 0}/100

━━━ OUTPUT SCHEMA ━━━
Return ONLY a valid JSON object — no markdown, no code fences, no text outside JSON.

{
  "summary": {
    "overview": "<3-4 sentence narrative summary of this month's finances, specific to the numbers>",
    "mostExpensiveDay": "<day of week that had highest avg spend>",
    "keyTakeaway": "<single most important financial insight for this month>"
  },
  "categoryInsights": [
    {
      "category": "<category name>",
      "trend": "<increasing|decreasing|stable>",
      "insight": "<1-2 sentence specific insight about this category's spending>",
      "recommendation": "<specific actionable recommendation>"
    }
  ],
  "budgetPerformance": {
    "score": <0-100>,
    "grade": "<A|B|C|D|F>",
    "summary": "<2-3 sentence budget performance analysis>",
    "topOverspendCategory": "<category name or null>",
    "topUnderspendCategory": "<category name or null>"
  },
  "healthScore": {
    "score": <0-100: weighted composite of the 4 components above>,
    "grade": "<Excellent|Good|Average|Poor>",
    "summary": "<2 sentence health score explanation>"
  },
  "weeklyInsights": [
    {
      "week": "<e.g. Week 1 (1-7 ${ctx.reportMonthLabel})>",
      "insight": "<specific insight about this week's spending pattern>",
      "standoutFact": "<one notable fact about this week>"
    }
  ],
  "spendingTrends": {
    "direction": "<increasing|decreasing|stable|volatile>",
    "peakDay": "<day of week with highest spending>",
    "peakWeek": "<which week number had highest spend>",
    "consistencyScore": <0-100: how consistent daily spending was>,
    "insight": "<2-3 sentence trend analysis>"
  },
  "aiRecommendations": {
    "executiveSummary": "<3-4 sentence executive summary of the month with specific numbers>",
    "immediateActions": [
      { "rank": 1, "action": "<specific action>", "impact": "<high|medium|low>", "estimatedSaving": <number> },
      { "rank": 2, "action": "<specific action>", "impact": "<high|medium|low>", "estimatedSaving": <number> },
      { "rank": 3, "action": "<specific action>", "impact": "<high|medium|low>", "estimatedSaving": <number> }
    ],
    "savingsOpportunities": [
      { "title": "<opportunity title>", "description": "<specific description with ₹ amounts>", "estimatedSaving": <number>, "difficulty": "<easy|moderate|hard>" },
      { "title": "<opportunity title>", "description": "<specific description with ₹ amounts>", "estimatedSaving": <number>, "difficulty": "<easy|moderate|hard>" }
    ],
    "positiveHighlights": ["<thing user did well>", "<thing user did well>"],
    "riskAlerts": [
      { "severity": "<high|medium|low>", "title": "<alert title>", "description": "<specific risk description>" }
    ],
    "nextMonthGoals": ["<specific measurable goal for next month>", "<specific measurable goal>", "<specific measurable goal>"],
    "financialHealthSummary": "<2-3 sentence overall financial health assessment>"
  }
}

RULES:
1. Use ₹ for all monetary values in text
2. All numbers must be based strictly on the data provided — never fabricate
3. healthScore.score = (savingsRate*0.30 + budgetAdherence*0.25 + spendingConsistency*0.15 + expenseToIncome*0.20 + 70*0.10) rounded to integer
4. immediateActions must have exactly 3 items ranked 1-3
5. savingsOpportunities must have 2-4 items
6. positiveHighlights must have 2-3 items
7. riskAlerts: empty array if finances are healthy (score >= 75)
8. nextMonthGoals must have exactly 3 specific, measurable goals
`.trim();
