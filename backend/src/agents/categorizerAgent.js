import { generateText } from "../services/groqService.js";
import { buildCategorizerPrompt,
         buildBatchCategorizerPrompt,
         AGENT_CATEGORIES }                          from "./prompts/categorizerPrompt.js";
import ApiError                                      from "../utils/ApiError.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences Gemini sometimes wraps around JSON.
 */
const cleanJSON = (raw) => raw.replace(/```json|```/gi, "").trim();

/**
 * Validates that a parsed result object has the required shape.
 */
const isValidResult = (obj) =>
  obj &&
  typeof obj === "object" &&
  AGENT_CATEGORIES.includes(obj.category) &&
  typeof obj.confidence === "number" &&
  obj.confidence >= 0 &&
  obj.confidence <= 1 &&
  typeof obj.reasoning === "string";

const detectKeywordCategory = (title = "") => {
  const t = String(title).toLowerCase().trim();
  if (t.includes("food") || t.includes("lunch") || t.includes("dinner") || t.includes("breakfast") || t.includes("cafe") || t.includes("starbucks") || t.includes("pizza") || t.includes("swiggy") || t.includes("zomato") || t.includes("restaurant") || t.includes("snack") || t.includes("tea") || t.includes("coffee") || t.includes("grocery") || t.includes("burger")) {
    return "Food & Dining";
  }
  if (t.includes("movie") || t.includes("film") || t.includes("netflix") || t.includes("cinema") || t.includes("ticket") || t.includes("show") || t.includes("game") || t.includes("prime")) {
    return "Entertainment";
  }
  if (t.includes("notebook") || t.includes("book") || t.includes("tuition") || t.includes("course") || t.includes("school") || t.includes("college") || t.includes("exam") || t.includes("class") || t.includes("udemy") || t.includes("coursera")) {
    return "Education";
  }
  if (t.includes("uber") || t.includes("ola") || t.includes("cab") || t.includes("taxi") || t.includes("auto") || t.includes("fuel") || t.includes("petrol") || t.includes("diesel") || t.includes("flight") || t.includes("indigo") || t.includes("train") || t.includes("bus")) {
    return "Transport";
  }
  if (t.includes("emi") || t.includes("rent") || t.includes("housing") || t.includes("home loan") || t.includes("flat") || t.includes("apartment")) {
    return "Housing & EMI";
  }
  if (t.includes("medicine") || t.includes("doctor") || t.includes("pharmacy") || t.includes("hospital") || t.includes("clinic") || t.includes("health") || t.includes("apollo") || t.includes("medical")) {
    return "Healthcare";
  }
  if (t.includes("wifi") || t.includes("broadband") || t.includes("airtel") || t.includes("jio") || t.includes("recharge") || t.includes("electricity") || t.includes("water bill") || t.includes("bill")) {
    return "Bills & Utilities";
  }
  if (t.includes("zudio") || t.includes("apparel") || t.includes("shirt") || t.includes("pant") || t.includes("cloth") || t.includes("shoes") || t.includes("amazon") || t.includes("flipkart") || t.includes("shopping") || t.includes("fashion")) {
    return "Shopping";
  }
  if (t.includes("tour") || t.includes("trip") || t.includes("hotel") || t.includes("resort") || t.includes("vacation")) {
    return "Travel";
  }
  return "Other";
};

/**
 * Safe fallback result when parsing or validation fails.
 */
const fallbackResult = (title = "", reason = "Categorization completed.") => {
  const category = detectKeywordCategory(title);
  return {
    category:   category !== "Other" ? category : "Other",
    confidence: category !== "Other" ? 0.90 : 0.50,
    reasoning:  category !== "Other" ? `Categorized as ${category} based on transaction title pattern matching.` : reason,
    fallback:   true,
  };
};

// ─── Single Categorization ────────────────────────────────────────────────────

/**
 * Categorizes a single expense using Gemini.
 * Retries once on parse failure before returning a fallback.
 *
 * @param {{ title: string, amount: number, notes?: string }} expense
 * @returns {Promise<{ category: string, confidence: number, reasoning: string, fallback?: boolean }>}
 */
const categorizeOne = async (expense) => {
  if (!expense?.title?.trim()) {
    throw ApiError.badRequest("Expense title is required for categorization.");
  }

  const prompt = buildCategorizerPrompt(expense);

  // Attempt 1
  try {
    const raw    = await generateText(prompt);
    const parsed = JSON.parse(cleanJSON(raw));
    if (isValidResult(parsed)) return parsed;
  } catch {
    // fall through to retry
  }

  // Attempt 2 — retry once with a stricter reminder appended
  try {
    const retryPrompt = prompt + "\n\nIMPORTANT: Return ONLY the raw JSON object. No text before or after.";
    const raw    = await generateText(retryPrompt);
    const parsed = JSON.parse(cleanJSON(raw));
    if (isValidResult(parsed)) return parsed;
  } catch {
    // fall through to fallback
  }

  console.warn(`[CategorizerAgent] Failed to parse result for: "${expense.title}". Using fallback.`);
  return fallbackResult(expense.title, "Could not determine category from AI response.");
};

// ─── Batch Categorization ─────────────────────────────────────────────────────

/**
 * Categorizes multiple expenses in a single Gemini call.
 * Falls back to individual categorization if batch parsing fails.
 * Falls back to "Other" for any item that fails individually.
 *
 * @param {Array<{ id: string, title: string, amount: number, notes?: string }>} expenses
 * @returns {Promise<Array<{ id: string, category: string, confidence: number, reasoning: string, fallback?: boolean }>>}
 */
const categorizeBatch = async (expenses) => {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    throw ApiError.badRequest("A non-empty array of expenses is required.");
  }
  if (expenses.length > 20) {
    throw ApiError.badRequest("Batch size cannot exceed 20 expenses per request.");
  }

  // Validate each item has a title
  expenses.forEach((e, i) => {
    if (!e?.title?.trim()) {
      throw ApiError.badRequest(`Expense at index ${i} is missing a title.`);
    }
  });

  const prompt = buildBatchCategorizerPrompt(expenses);

  // ── Attempt batch call ────────────────────────────────────────────────────
  try {
    const raw    = await generateText(prompt);
    const parsed = JSON.parse(cleanJSON(raw));

    if (Array.isArray(parsed) && parsed.length === expenses.length) {
      const allValid = parsed.every(
        (item) => item.id && isValidResult(item)
      );
      if (allValid) return parsed;
    }
  } catch {
    console.warn("[CategorizerAgent] Batch parse failed. Falling back to individual calls.");
  }

  // ── Fallback: categorize each individually ────────────────────────────────
  const results = await Promise.allSettled(
    expenses.map((e) =>
      categorizeOne(e).then((result) => ({ id: e.id, ...result }))
    )
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { id: expenses[i].id, ...fallbackResult("Individual categorization failed.") }
  );
};

export { categorizeOne, categorizeBatch, AGENT_CATEGORIES };
