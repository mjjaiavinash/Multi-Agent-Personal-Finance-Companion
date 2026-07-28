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

  // Trend / Spending / Total spent: "how much", "how much money", "total spent", "spent", "expenses", "used"
  if (/how much|total spent|my spend|my expense|iam used|used|how much money|why (did|is|are)|more this month|spend more|increased|went up|higher than/.test(lower)) {
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
 * @param {Object} context - Enriched financial context from the service layer
 * @param {string} intent  - Detected intent of the current message
 * @returns {string}
 */
const buildSystemPrompt = (context, intent) => {
  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const totalSpent = Number(context?.totalSpent || 0);
  const thisMonth  = Number(context?.thisMonth || 0);
  const lastMonth  = Number(context?.lastMonth || 0);
  const count      = Number(context?.count || 0);
  const income     = Number(context?.monthlyIncome || 0);
  const budget     = Number(context?.monthlyBudget || 0);
  const available  = Math.max(0, (budget || income) - thisMonth);

  const financialSnapshot = `
━━━ USER'S REAL-TIME FINANCIAL SNAPSHOT ━━━
User Name:                  ${context?.userName || "User"}
Monthly Income:             ${income > 0 ? fmt(income) : "Not set"}
Monthly Budget Target:      ${budget > 0 ? fmt(budget) : "Not set"}
Available Balance:          ${fmt(available)}
Total Spent (All-Time):     ${fmt(totalSpent)}
This Month's Spending:      ${fmt(thisMonth)}
Last Month's Spending:      ${fmt(lastMonth)}
Total Transactions Logged:  ${count}
Average Per Transaction:    ${fmt(context?.avgPerDay || 0)}

Spending by Category:
${
  context?.byCategory && Object.keys(context.byCategory).length > 0
    ? Object.entries(context.byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amt]) => `  • ${cat}: ${fmt(amt)}`)
        .join("\n")
    : "  No category spending logged yet."
}

Monthly Trend (last 6 months):
${
  context?.monthly && context.monthly.length > 0
    ? context.monthly.map((m) => `  • ${m.month}: ${fmt(m.total)}`).join("\n")
    : "  No monthly trend history yet."
}

Recurring Expenses:
${
  context?.recurringExpenses && context.recurringExpenses.length > 0
    ? context.recurringExpenses
        .slice(0, 8)
        .map((r) => `  • ${r.title} (${r.category}): ~${fmt(r.monthlyEstimate)}/mo`)
        .join("\n")
    : "  No recurring expenses detected yet."
}
`;

  return `You are SpendSense AI — a professional personal finance assistant built into the SpendSense expense tracking app.

━━━ YOUR PERSONA ━━━
• Expert-level financial knowledge, delivered in plain English
• Data-driven: always reference the user's actual numbers from the financial snapshot below
• Direct and honest: give clear verdicts, not wishy-washy "it depends" answers
• Empathetic but not preachy: acknowledge trade-offs without lecturing
• Concise: respect the user's time — no padding, no filler sentences

━━━ YOUR CAPABILITIES ━━━
• Spending query: "How much did I spend this month / total?" → quote exact figures from snapshot
• Affordability analysis: "Can I buy X?" → calculate impact on budget and give a verdict
• Spending trend diagnosis: "Why did I spend more?" → identify the exact categories and amounts
• Budget planning: "Help me plan my budget" → propose category-by-category allocations
• Savings coaching: "How can I save more?" → identify specific cuts with dollar amounts
${financialSnapshot}
━━━ STRICT RULES ━━━
1. ALWAYS state exact figures from the FINANCIAL SNAPSHOT above when asked about money, spending, income, or budget.
2. When asked about spending, state both "This Month's Spending: ${fmt(thisMonth)}" and "All-Time Total Spent: ${fmt(totalSpent)}" (${count} total transactions logged). If This Month is ₹0 but All-Time total spent is greater than ₹0, mention that the expenses were logged under prior dates or all-time entries.
3. NEVER claim "I don't have any data" or "you haven't added expenses" — the exact snapshot numbers are given above.
4. Format responses with clear structure: use line breaks between sections, bold key numbers with **, and use bullet points for lists.
5. Keep responses under 250 words unless the user explicitly asks for a detailed breakdown.
6. CRITICAL: Always rely on the latest REAL-TIME FINANCIAL SNAPSHOT above for current figures. Ignore any previous turn history in the chat where you previously reported zero or missing data.
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

  console.log("[chatAgent] Sending prompt to Groq with context stats:", {
    user: userContext?.userName,
    totalSpent: userContext?.totalSpent,
    thisMonth: userContext?.thisMonth,
    count: userContext?.count,
  });

  const messages = [
    { role: "system",  content: systemPrompt },
    ...chatHistory,
    { role: "user",    content: userMessage },
  ];

  return generateChat(messages);
};

export { processChat, detectIntent };
