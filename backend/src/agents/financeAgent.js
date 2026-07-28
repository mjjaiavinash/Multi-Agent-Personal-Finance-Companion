import { generateText } from "../services/groqService.js";
import ApiError from "../utils/ApiError.js";

/**
 * Builds a structured prompt from the user's expense data
 * and asks Gemini to return a JSON analysis.
 *
 * @param {Object} expenseSummary - Aggregated expense data from DB
 * @returns {Promise<Object>} Parsed AI analysis result
 */
const analyzeExpenses = async (expenseSummary) => {
  const prompt = `
You are a personal finance AI assistant. Analyze the following expense data and return a JSON object.

Expense Data:
${JSON.stringify(expenseSummary, null, 2)}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "summary": "<2-3 sentence overview of spending habits>",
  "topCategory": { "name": "<category>", "amount": <number> },
  "savingsPotential": <number>,
  "recommendations": ["<tip 1>", "<tip 2>", "<tip 3>"]
}
`.trim();

  const raw = await generateText(prompt);

  try {
    // Strip markdown code fences if model wraps the response
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Return a structured fallback rather than a hard 500 crash
    console.error("[FinanceAgent] Failed to parse AI response — returning fallback.");
    return {
      summary:          "Unable to generate AI analysis at this time. Please try again.",
      topCategory:      { name: "General", amount: 0 },
      savingsPotential: 0,
      recommendations:  [
        "Review your largest expense categories.",
        "Try to keep monthly spending under your budget.",
        "Set up a savings goal to build financial discipline.",
      ],
    };
  }
};

export { analyzeExpenses };
