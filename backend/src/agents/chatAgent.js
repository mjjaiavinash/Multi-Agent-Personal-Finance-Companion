import { generateChat } from "../services/groqService.js";

// ─── Intent Detection ─────────────────────────────────────────────────────────

/**
 * Classifies the user's message into a broad intent category.
 * Used to append intent-specific instructions to the system prompt,
 * making Gemini's response format match what the user actually needs.
 *
 * This is a lightweight keyword classifier — no extra Gemini call needed.
 * Accuracy is sufficient because the system prompt handles all intents anyway;
 * this just sharpens the focus for the most common question types.
 *
 * @param {string} message
 * @returns {"affordability" | "trend" | "budget" | "savings" | "general"}
 */
const detectIntent = (message) => {
  const lower = message.toLowerCase();

  // Affordability: "can I buy", "can I afford", "should I buy", "is it worth"
  if (/can i (buy|afford|get|purchase)|should i buy|worth buying|afford/.test(lower)) {
    return "affordability";
  }

  // Trend: "why did I spend", "why is my", "more this month", "increased", "went up"
  if (/why (did|is|are)|more this month|spend more|increased|went up|higher than/.test(lower)) {
    return "trend";
  }

  // Budget: "help me plan", "budget", "allocate", "how much should I spend"
  if (/budget|plan my|allocate|how much should i spend|spending limit/.test(lower)) {
    return "budget";
  }

  // Savings: "save more", "save money", "savings goal", "cut expenses", "reduce spending"
  if (/save more|save money|savings goal|cut expense|reduce spending|spend less/.test(lower)) {
    return "savings";
  }

  return "general";
};

// ─── Intent-Specific Response Instructions ────────────────────────────────────

/**
 * Returns additional instructions appended to the system prompt based on intent.
 * Each intent gets a specific response format that matches user expectations.
 *
 * @param {"affordability"|"trend"|"budget"|"savings"|"general"} intent
 * @returns {string}
 */
const getIntentInstructions = (intent) => {
  const instructions = {
    affordability: `
RESPONSE FORMAT FOR AFFORDABILITY QUESTIONS:
1. Start with a direct YES or NO verdict based on the user's financial data.
2. Show the math: current monthly surplus, cost of item, impact on budget.
3. Give a concrete recommendation: buy now / save for X months / avoid.
4. Keep it under 150 words. Be direct, not preachy.`,

    trend: `
RESPONSE FORMAT FOR TREND/SPENDING QUESTIONS:
1. Identify the specific category or categories driving the increase using the data.
2. Quantify the change: "Your Food & Dining spend rose from $X to $Y (+Z%)".
3. Suggest 2 specific actions to reverse the trend.
4. Reference actual months and amounts from the data — never be vague.`,

    budget: `
RESPONSE FORMAT FOR BUDGET PLANNING QUESTIONS:
1. Propose a concrete monthly budget using the 50/30/20 rule as a baseline.
2. Show category-by-category allocations based on the user's actual spending history.
3. Highlight the 2-3 categories that need the most adjustment.
4. End with one specific first step the user can take today.`,

    savings: `
RESPONSE FORMAT FOR SAVINGS QUESTIONS:
1. Calculate a realistic monthly savings target (minimum 10-20% of estimated income).
2. Identify the top 3 specific cuts the user can make based on their actual data.
3. Show the compounding impact: "Saving $X/month = $Y in 12 months".
4. Suggest one automated savings strategy (e.g., auto-transfer on payday).`,

    general: `
RESPONSE FORMAT FOR GENERAL QUESTIONS:
1. Answer directly and specifically using the user's financial data.
2. Include at least one concrete number from their spending history.
3. End with one actionable next step.
4. Keep responses concise — under 200 words unless a detailed breakdown is requested.`,
  };

  return instructions[intent] || instructions.general;
};

// ─── System Prompt Builder ────────────────────────────────────────────────────

/**
 * Builds a rich, structured system prompt that grounds Gemini in the user's
 * actual financial data and configures its persona, capabilities, and constraints.
 *
 * Design decisions:
 * - Financial context is injected as structured JSON so Gemini can reference
 *   exact numbers rather than making up plausible-sounding figures.
 * - Explicit "NEVER" rules prevent hallucination of income, savings rates, etc.
 * - Intent-specific instructions are appended so the response format matches
 *   what the user actually asked for.
 * - The persona is professional but conversational — not robotic, not overly casual.
 *
 * @param {Object} context - Enriched financial context from the service layer
 * @param {string} intent  - Detected intent of the current message
 * @returns {string}
 */
const buildSystemPrompt = (context, intent) => {
  const hasData = context && (context.totalSpent > 0 || context.count > 0);

  const fmt = (n) => `₹${Number(n ?? 0).toFixed(2)}`;

  const financialSnapshot = hasData
    ? `
━━━ USER'S FINANCIAL SNAPSHOT ━━━
Total Spent (all time):     ${fmt(context.totalSpent)}
Total Transactions:         ${context.count ?? 0}
This Month's Spending:      ${fmt(context.thisMonth)}
Last Month's Spending:      ${fmt(context.lastMonth)}
Month-over-Month Change:    ${
      context.thisMonth && context.lastMonth && context.lastMonth > 0
        ? `${(((context.thisMonth - context.lastMonth) / context.lastMonth) * 100).toFixed(1)}%`
        : "N/A"
    }
Average Per Transaction:    ${fmt(context.avgPerDay)}

Spending by Category:
${
  context.byCategory && Object.keys(context.byCategory).length > 0
    ? Object.entries(context.byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amt]) => `  • ${cat}: ${fmt(amt)}`)
        .join("\n")
    : "  No category data available yet."
}

Monthly Trend (last 6 months):
${
  context.monthly && context.monthly.length > 0
    ? context.monthly.map((m) => `  • ${m.month}: ${fmt(m.total)}`).join("\n")
    : "  No monthly trend data available yet."
}

Recurring Expenses:
${
  context.recurringExpenses && context.recurringExpenses.length > 0
    ? context.recurringExpenses
        .slice(0, 8)
        .map((r) => `  • ${r.title} (${r.category}): ~${fmt(r.monthlyEstimate)}/mo`)
        .join("\n")
    : "  No recurring expenses detected yet."
}

Top Spending Categories:
${
  context.topCategories && context.topCategories.length > 0
    ? context.topCategories
        .map((c) => `  • ${c.category}: ${fmt(c.total)} (${c.percentage}% of total, avg ${fmt(c.monthlyAvg)}/mo)`)
        .join("\n")
    : "  No category breakdown available yet."
}
`
    : `
━━━ USER'S FINANCIAL SNAPSHOT ━━━
No expense data recorded yet. The user is new to SpendSense AI.
Provide general financial advice and encourage them to add their first expenses.
`;

  return `You are SpendSense AI — a professional personal finance assistant built into the SpendSense expense tracking app.

━━━ YOUR PERSONA ━━━
• Expert-level financial knowledge, delivered in plain English
• Data-driven: always reference the user's actual numbers, never generic estimates
• Direct and honest: give clear verdicts, not wishy-washy "it depends" answers
• Empathetic but not preachy: acknowledge trade-offs without lecturing
• Concise: respect the user's time — no padding, no filler sentences

━━━ YOUR CAPABILITIES ━━━
• Affordability analysis: "Can I buy X?" → calculate impact on budget and give a verdict
• Spending trend diagnosis: "Why did I spend more?" → identify the exact categories and amounts
• Budget planning: "Help me plan my budget" → propose category-by-category allocations
• Savings coaching: "How can I save more?" → identify specific cuts with dollar amounts
• General financial Q&A: answer any personal finance question using the user's data as context
${financialSnapshot}
━━━ STRICT RULES ━━━
1. NEVER invent numbers not present in the financial snapshot above.
2. NEVER assume an income figure unless the user explicitly states one — estimate it as monthlyExpenses / 0.75 if needed and clearly label it as an estimate.
3. ALWAYS reference specific dollar amounts from the data when available.
4. NEVER give generic advice that ignores the user's actual spending patterns.
5. If the user asks about a purchase amount, compare it against their monthly surplus and savings rate.
6. Format responses with clear structure: use line breaks between sections, bold key numbers with **, and use bullet points for lists.
7. Keep responses under 300 words unless the user explicitly asks for a detailed breakdown.
8. If data is insufficient to answer precisely, say so clearly and explain what data would help.
${getIntentInstructions(intent)}
━━━ CURRENT DATE ━━━
${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
};

// ─── Core Agent Function ──────────────────────────────────────────────────────

/**
 * Processes a user chat message with full financial context and intent awareness.
 *
 * Architecture:
 * - System prompt is injected as the first user/model exchange in history.
 *   This is the standard Gemini pattern for system-level instructions since
 *   the Gemini API does not have a dedicated "system" role.
 * - Intent is detected from the current message to sharpen response format.
 * - On fresh conversations (no history), the full system primer is prepended.
 * - On continuing conversations, the existing history already contains the primer,
 *   so we pass it through unchanged — preserving full multi-turn context.
 * - The financial context is re-injected on every fresh conversation start
 *   so Gemini always has up-to-date data (user may have added expenses since
 *   the last session).
 *
 * @param {string} userMessage   - The user's current message
 * @param {Array}  chatHistory   - Prior Gemini-format [{role, parts}] turns
 * @param {Object} userContext   - Enriched financial context from the service layer
 * @returns {Promise<string>}    - The AI reply text
 */
const processChat = async (userMessage, chatHistory = [], userContext = {}) => {
  const intent       = detectIntent(userMessage);
  const systemPrompt = buildSystemPrompt(userContext, intent);

  // Groq supports a dedicated "system" role — inject context cleanly.
  // chatHistory arrives as [{role, content}] from the frontend.
  // On the first turn it is empty; on subsequent turns it holds prior exchanges.
  const messages = [
    { role: "system",  content: systemPrompt },
    ...chatHistory,
    { role: "user",    content: userMessage },
  ];

  return generateChat(messages);
};

export { processChat, detectIntent };
