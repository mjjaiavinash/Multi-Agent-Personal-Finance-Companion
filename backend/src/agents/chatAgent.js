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
  const lower = message.trim().toLowerCase();

  // Greetings: "hi", "hii", "hello", "hey", "good morning", etc.
  if (/^(hi+|hello|hey|greetings|good morning|good evening|good afternoon|howdy)(\s|!|\.|$)/i.test(lower)) {
    return "greeting";
  }

  // Direct Spending Query: "how much money i spend", "how much did i spend", "total spent", "my spend"
  if (/how much (money |did i |have i |i |my )?(spend|spent)|total (spend|spent|expense|expenses)|my total spend/.test(lower)) {
    return "spending_query";
  }

  // Affordability: "can I buy", "can I afford", "should I buy", "is it worth"
  if (/can i (buy|afford|get|purchase)|should i buy|worth buying|afford/.test(lower)) {
    return "affordability";
  }

  // Trend / Spending Comparison: "why did I spend more", "more this month", "increased"
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
 * @param {"greeting"|"spending_query"|"affordability"|"trend"|"budget"|"savings"|"general"} intent
 * @returns {string}
 */
const getIntentInstructions = (intent) => {
  const instructions = {
    greeting: `
RESPONSE FORMAT FOR GREETINGS (e.g. "hii", "hello", "hey"):
1. Reply with a warm, friendly, professional greeting.
2. Briefly introduce yourself as SpendSense AI.
3. List 3-4 specific financial topics the user can ask you (e.g., Affordability checks, Spending trend analysis, 50/30/20 Budget planning, Expense cutting).
4. CRITICAL: DO NOT dump or list raw financial snapshot zeroes or tell the user to configure settings. Keep it crisp, inviting, and under 80 words.`,

    spending_query: `
RESPONSE FORMAT FOR SPENDING QUERIES (e.g. "how much money i spend this month", "how much did I spend"):
1. Start immediately with a clear, direct summary of their spending:
   • Recent Active Spending: **₹X**
   • All-Time Total Spent: **₹Y** across **N** logged transactions.
2. Show their top category breakdown with exact ₹ amounts and percentage shares:
   • Food & Dining: **₹A** (X%)
   • Housing & EMI: **₹B** (Y%)
   • Shopping / Other: **₹C** (Z%)
3. Quote 3-4 specific logged transaction titles from their recent history list (e.g. "• Starbucks Coffee: ₹250", "• Zomato: ₹450").
4. CRITICAL: NEVER claim "the exact figure is ₹0" or say "you haven't spent any money" if total spent is greater than ₹0. If current calendar month has no new entries, state: "In your recent active period you logged **₹X** (and **₹Y** total across all history)."`,

    affordability: `
RESPONSE FORMAT FOR AFFORDABILITY QUESTIONS (e.g. "Can I afford a ₹50,000 laptop this month?"):
1. Start immediately with a clear **VERDICT**: **YES**, **NO**, or **RECOMMENDED SAVINGS PLAN**.
2. Show the exact math using numbers from the financial snapshot:
   • Monthly Income Baseline: **₹X**
   • Average Monthly Spending: **₹Y**
   • Net Monthly Surplus: **₹(X - Y)**
3. Evaluate the purchase against their surplus. If the item costs ₹50,000 and net monthly surplus is ₹35,000:
   • Calculate exact timeline: "Saving for 1.4 months (or setting aside ₹25,000/month for 2 months) enables you to buy it safely without debt."
4. Provide a 2-step financial advice bullet list. Keep response under 180 words.`,

    trend: `
RESPONSE FORMAT FOR TREND/SPENDING COMPARISON QUESTIONS (e.g. "Why did I spend more this month than last month?"):
1. State the exact overall figures from the snapshot:
   • Recent Spending: **₹X**
   • Prior Period Spending: **₹Y**
   • Variance: **+₹(X - Y)** (+Z% increase).
2. Highlight the top 2-3 specific category drivers responsible for the increase (e.g. Food & Dining, Shopping, Housing & EMI) with exact ₹ figures from Spending by Category.
3. Provide 2 concrete corrective action steps to lower spending back to baseline.`,

    budget: `
RESPONSE FORMAT FOR BUDGET PLANNING QUESTIONS (e.g. "Help me plan a realistic monthly budget."):
1. Construct a concrete 50/30/20 monthly budget breakdown based on their income:
   • **Needs (50%)**: **₹X** (Housing & EMI, Bills & Utilities, Healthcare)
   • **Wants (30%)**: **₹Y** (Food & Dining, Shopping, Entertainment)
   • **Savings & Investments (20%)**: **₹Z** (Emergency Fund, Goals)
2. Provide custom category limits tailored to their top spending categories.
3. End with one high-impact action step they can execute today.`,

    savings: `
RESPONSE FORMAT FOR SAVINGS / CUT EXPENSES QUESTIONS (e.g. "Which expenses should I cut first to save money?"):
1. Identify the top 3 highest non-essential spending categories from their actual data (e.g., Food & Dining, Shopping, Entertainment).
2. Show specific ₹ reduction targets for each category (e.g. "Cut Food & Dining by 20% to save ₹3,500/month").
3. Calculate 12-month compounding impact: "Saving **₹X/month** = **₹(X * 12)** saved in 1 year."
4. Suggest one automated rule (e.g., auto-transfer 20% on payday).`,

    general: `
RESPONSE FORMAT FOR GENERAL QUESTIONS:
1. Answer directly with high financial authority.
2. Quote exact numbers from the user's financial snapshot.
3. Provide an actionable recommendation.`,
  };

  return instructions[intent] || instructions.general;
};

// ─── System Prompt Builder ────────────────────────────────────────────────────

/**
 * Builds a rich, structured system prompt that grounds Gemini/Groq in the user's
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
Monthly Income:             ${fmt(income)}
Monthly Budget Target:      ${fmt(budget)}
Available Monthly Balance:  ${fmt(available)}
Total Spent (All-Time):     ${fmt(totalSpent)}
Recent Active Month Spend:  ${fmt(thisMonth)}
Prior Period Spend:         ${fmt(lastMonth)}
Total Transactions Logged:  ${count}
Average Per Transaction:    ${fmt(context?.avgPerDay || 0)}

Spending by Category:
${
  context?.byCategory && Object.keys(context.byCategory).length > 0
    ? Object.entries(context.byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amt]) => `  • ${cat}: ${fmt(amt)} (${totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0}% of total)`)
        .join("\n")
    : "  No category spending logged yet."
}

Recent Logged Transactions (Last 10):
${
  context?.recentExpenses && context.recentExpenses.length > 0
    ? context.recentExpenses
        .map((e) => `  • ${e.title} (${e.category}): ${fmt(e.amount)} on ${e.date}`)
        .join("\n")
    : "  No recent transactions listed."
}

Monthly Trend History:
${
  context?.monthly && context.monthly.length > 0
    ? context.monthly.map((m) => `  • ${m.month}: ${fmt(m.total)}`).join("\n")
    : "  No monthly trend history yet."
}

Recurring Expenses / Subscriptions:
${
  context?.recurringExpenses && context.recurringExpenses.length > 0
    ? context.recurringExpenses
        .slice(0, 8)
        .map((r) => `  • ${r.title} (${r.category}): ~${fmt(r.monthlyEstimate)}/mo`)
        .join("\n")
    : "  No recurring expenses detected yet."
}
`;

  return `You are SpendSense AI — a premier personal finance assistant built into the SpendSense app.

━━━ YOUR PERSONA ━━━
• Highly intelligent financial advisor with deep mastery of budgeting, savings, and expense optimization.
• Data-driven: ALWAYS ground your reasoning in the exact numbers from the FINANCIAL SNAPSHOT below.
• Direct & Decisive: Give clear verdicts (YES, NO, or STEP-BY-STEP PLAN), not vague "maybe" responses.
• Use clear formatting: Bold key amounts with **, use bullet points, and structure with clean headers.

${financialSnapshot}

━━━ MANDATORY RULES ━━━
1. FOR GREETINGS (e.g. "hi", "hii", "hello"): Reply warmly, introduce yourself, and invite financial questions. DO NOT dump or list raw financial snapshot stats.
2. FOR SPENDING QUERIES (e.g. "how much money i spend this month"): State recent active spending (**${fmt(thisMonth)}**) and total spent (**${fmt(totalSpent)}** across ${count} transactions). Show top categories and list 2-3 recent transaction names from the snapshot.
3. NEVER claim "your spend is ₹0" or say "you haven't spent any money" if total spent is greater than ₹0.
4. Format with bold numbers (**₹50,000**), clean bullet points, and concise section headers.

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
