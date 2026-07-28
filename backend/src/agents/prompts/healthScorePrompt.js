/**
 * Builds the AI prompt for generating personalized financial health recommendations.
 *
 * @param {Object} scoreData - Computed score and component breakdown
 * @param {Object} context   - Raw financial context (income, expenses, categories)
 * @returns {string}
 */
export const buildHealthScorePrompt = (scoreData, context) => `
You are a certified financial advisor AI. Analyze this user's financial health data and provide personalized, actionable recommendations.

FINANCIAL HEALTH DATA:
- Overall Score: ${scoreData.score}/100 (${scoreData.grade})
- Savings Rate Score: ${scoreData.components.savingsRate}/100
- Budget Adherence Score: ${scoreData.components.budgetAdherence}/100
- Spending Consistency Score: ${scoreData.components.spendingConsistency}/100
- Expense-to-Income Score: ${scoreData.components.expenseToIncome}/100
- Debt Ratio Score: ${scoreData.components.debtRatio}/100

RAW FINANCIALS:
- Monthly Income: ₹${context.monthlyIncome}
- This Month's Expenses: ₹${context.thisMonthExpenses}
- Monthly Budget: ₹${context.monthlyBudget}
- Savings This Month: ₹${Math.max(0, context.monthlyIncome - context.thisMonthExpenses)}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Top Spending Category: ${context.topCategory || "N/A"}
- Monthly Expense Trend: ${context.trend || "stable"}
- Months of Data: ${context.monthsAnalyzed}

TOP SPENDING CATEGORIES:
${Object.entries(context.byCategory || {}).map(([cat, amt]) => `  - ${cat}: ₹${amt}`).join("\n")}

Return ONLY a valid JSON object with this exact structure:
{
  "reason": "2-3 sentence explanation of the score in plain language",
  "improvementSuggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"],
  "positiveHabits": ["habit 1", "habit 2", "habit 3"],
  "riskFactors": ["risk 1", "risk 2"]
}

Rules:
- Be specific to the actual numbers, not generic
- improvementSuggestions: 3-5 actionable items with specific ₹ amounts where possible
- positiveHabits: 2-4 things the user is doing well (if score < 40, still find at least 1)
- riskFactors: 1-3 financial risks based on the data (empty array if score >= 80)
- Use INR (₹) for all monetary values
- Keep each string under 120 characters
`;
