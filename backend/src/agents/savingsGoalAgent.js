import { generateText } from "../services/groqService.js";

const cleanJSON = (raw) => raw.replace(/```json|```/gi, "").trim();
const safeParse = (raw) => { try { return JSON.parse(cleanJSON(raw)); } catch { return null; } };

export const generateGoalSuggestions = async (goal, userContext) => {
  const prompt = `
You are a senior personal finance AI advisor. Help the user reach their savings goal FASTER.

━━━ SAVINGS GOAL DETAILS ━━━
- Goal Title: ${goal.title}
- Target Amount: ₹${goal.targetAmount}
- Current Savings: ₹${goal.currentSavings}
- Remaining Amount: ₹${goal.targetAmount - goal.currentSavings}
- Target Deadline: ${goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "N/A"}
- Goal Category: ${goal.category}

━━━ USER FINANCIAL CONTEXT ━━━
- Monthly Income: ₹${userContext.monthlyIncome || 0}
- Average Monthly Spending: ₹${userContext.avgMonthlySpend || 0}
- Top Spending Categories: ${userContext.topCategories?.map(c => `${c.category} (₹${c.total})`).join(", ") || "General"}

━━━ OUTPUT REQUIREMENTS ━━━
Return ONLY a valid JSON object — no markdown, no code fences, no extra text.

{
  "suggestions": [
    {
      "title": "<Short actionable title>",
      "action": "<1-2 sentence specific step user can take>",
      "potentialSavingsPerMonth": <number in ₹>,
      "acceleratedCompletionDate": "<YYYY-MM-DD or X weeks earlier>"
    },
    {
      "title": "<Short actionable title>",
      "action": "<1-2 sentence specific step user can take>",
      "potentialSavingsPerMonth": <number in ₹>,
      "acceleratedCompletionDate": "<YYYY-MM-DD or X weeks earlier>"
    },
    {
      "title": "<Short actionable title>",
      "action": "<1-2 sentence specific step user can take>",
      "potentialSavingsPerMonth": <number in ₹>,
      "acceleratedCompletionDate": "<YYYY-MM-DD or X weeks earlier>"
    }
  ]
}

RULES:
1. Provide exactly 3 actionable acceleration suggestions.
2. All numbers must be realistic based on income and expenses.
3. Return ONLY valid JSON.
`.trim();

  try {
    const raw = await generateText(prompt, { temperature: 0.3, maxTokens: 1024 });
    const parsed = safeParse(raw);

    if (parsed && Array.isArray(parsed.suggestions)) {
      return parsed.suggestions;
    }
  } catch (err) {
    console.error("[SavingsGoalAgent] Groq call failed, using fallbacks:", err.message);
  }

  // Fallback suggestions
  const remaining = goal.targetAmount - goal.currentSavings;
  const monthlyCut = Math.round(remaining * 0.1);

  return [
    {
      title: "Reduce Non-Essential Dining Out",
      action: "Redirect 15% of your food & entertainment budget into this goal monthly.",
      potentialSavingsPerMonth: monthlyCut || 500,
      acceleratedCompletionDate: "3 weeks earlier"
    },
    {
      title: "Automate Weekly Deposits",
      action: "Set an automatic transfer of ₹250 every Monday directly to your savings account.",
      potentialSavingsPerMonth: 1000,
      acceleratedCompletionDate: "1 month earlier"
    },
    {
      title: "Micro-Savings Target",
      action: "Round up daily card purchases to the nearest ₹100 and deposit the spare change.",
      potentialSavingsPerMonth: 400,
      acceleratedCompletionDate: "2 weeks earlier"
    }
  ];
};
