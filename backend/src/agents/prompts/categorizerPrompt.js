/**
 * Expense Categorizer Prompt — v1
 *
 * Design principles:
 *  - Categories are explicitly defined with descriptions to reduce ambiguity
 *  - Few-shot examples anchor Gemini to the expected output format
 *  - Strict JSON-only instruction prevents markdown wrapping
 *  - Confidence score forces the model to express uncertainty
 *  - Fallback to "Other" is explicitly instructed for unknown inputs
 */

export const AGENT_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Medical",
  "Bills",
  "Entertainment",
  "Education",
  "Other",
];

const CATEGORY_DEFINITIONS = `
- Food        : Restaurants, cafes, groceries, food delivery, beverages, snacks
- Shopping    : Clothing, electronics, household items, online shopping, gifts
- Transport   : Fuel, taxi, ride-share, bus, train, flight, parking, vehicle maintenance
- Medical     : Doctor visits, pharmacy, hospital, health insurance, dental, vision
- Bills       : Electricity, water, internet, phone, rent, mortgage, subscriptions
- Entertainment: Movies, concerts, games, streaming services, sports, hobbies
- Education   : Tuition, books, courses, workshops, stationery, school supplies
- Other       : Anything that does not clearly fit the above categories
`.trim();

const FEW_SHOT_EXAMPLES = `
Input: { "title": "McDonald's dinner", "amount": 12.50, "notes": "" }
Output: { "category": "Food", "confidence": 0.99, "reasoning": "Fast food restaurant purchase." }

Input: { "title": "Uber ride to airport", "amount": 34.00, "notes": "early morning flight" }
Output: { "category": "Transport", "confidence": 0.98, "reasoning": "Ride-share service for travel." }

Input: { "title": "Netflix subscription", "amount": 15.99, "notes": "monthly" }
Output: { "category": "Bills", "confidence": 0.95, "reasoning": "Recurring streaming subscription treated as a bill." }

Input: { "title": "Paracetamol and vitamins", "amount": 8.40, "notes": "pharmacy" }
Output: { "category": "Medical", "confidence": 0.97, "reasoning": "Pharmacy purchase of medicine and supplements." }

Input: { "title": "Random stuff", "amount": 5.00, "notes": "" }
Output: { "category": "Other", "confidence": 0.55, "reasoning": "Insufficient information to determine a specific category." }
`.trim();

/**
 * Builds the categorization prompt for a single expense item.
 *
 * @param {{ title: string, amount: number, notes?: string }} expense
 * @returns {string}
 */
export const buildCategorizerPrompt = (expense) => `
You are an expert expense categorization AI. Your only job is to classify a given expense into exactly one category.

AVAILABLE CATEGORIES AND THEIR DEFINITIONS:
${CATEGORY_DEFINITIONS}

RULES:
1. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.
2. "category" must be exactly one of: ${AGENT_CATEGORIES.map((c) => `"${c}"`).join(", ")}.
3. "confidence" must be a float between 0.00 and 1.00 representing your certainty.
4. "reasoning" must be a single concise sentence explaining your choice.
5. If the title is vague or ambiguous, use "Other" with a low confidence score.
6. Never invent a category outside the provided list.

EXAMPLES:
${FEW_SHOT_EXAMPLES}

NOW CLASSIFY THIS EXPENSE:
${JSON.stringify({ title: expense.title, amount: expense.amount, notes: expense.notes || "" })}

Return ONLY this JSON structure:
{ "category": "<category>", "confidence": <0.00-1.00>, "reasoning": "<one sentence>" }
`.trim();

/**
 * Builds a batch categorization prompt for multiple expenses in one Gemini call.
 * More token-efficient than calling the single prompt N times.
 *
 * @param {Array<{ id: string, title: string, amount: number, notes?: string }>} expenses
 * @returns {string}
 */
export const buildBatchCategorizerPrompt = (expenses) => `
You are an expert expense categorization AI. Classify each expense in the array below.

AVAILABLE CATEGORIES AND THEIR DEFINITIONS:
${CATEGORY_DEFINITIONS}

RULES:
1. Return ONLY a valid JSON array — no markdown, no explanation, no code fences.
2. The array must have exactly ${expenses.length} objects, one per input expense, in the same order.
3. Each object must include the original "id" field unchanged.
4. "category" must be exactly one of: ${AGENT_CATEGORIES.map((c) => `"${c}"`).join(", ")}.
5. "confidence" must be a float between 0.00 and 1.00.
6. "reasoning" must be a single concise sentence.
7. Use "Other" for vague or unrecognizable expenses.

INPUT EXPENSES:
${JSON.stringify(expenses.map((e) => ({ id: e.id, title: e.title, amount: e.amount, notes: e.notes || "" })), null, 2)}

Return ONLY this JSON array structure:
[{ "id": "<original_id>", "category": "<category>", "confidence": <0.00-1.00>, "reasoning": "<one sentence>" }, ...]
`.trim();
