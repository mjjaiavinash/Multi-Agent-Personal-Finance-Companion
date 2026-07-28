/**
 * Agent Test Runner
 * Usage: node test-agent.mjs <agent>
 * Agents: categorizer | pattern | savings | budget | chat
 *
 * Examples:
 *   node test-agent.mjs categorizer
 *   node test-agent.mjs pattern
 *   node test-agent.mjs savings
 *   node test-agent.mjs budget
 *   node test-agent.mjs chat
 */

import { readFileSync } from "fs";

// ── Load .env manually ────────────────────────────────────────────────────────
const envText = readFileSync(".env", "utf8");
for (const line of envText.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key?.trim() && !key.startsWith("#")) {
    process.env[key.trim()] = rest.join("=").trim();
  }
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_EXPENSE = {
  title: "McDonald's dinner",
  amount: 18.5,
  notes: "late night meal",
};

const MOCK_EXPENSES_BATCH = [
  { id: "1", title: "Uber ride to office",   amount: 12.0 },
  { id: "2", title: "Netflix subscription",  amount: 15.99 },
  { id: "3", title: "Gym membership",        amount: 40.0 },
  { id: "4", title: "Grocery shopping",      amount: 85.0 },
  { id: "5", title: "Electric bill",         amount: 110.0 },
];

const MOCK_SPENDING_CONTEXT = {
  totalCount: 42,
  totalSpent: 3240.5,
  byCategory: {
    "Food & Dining":      820.0,
    "Transportation":     310.0,
    "Shopping":           540.0,
    "Entertainment":      180.0,
    "Bills & Utilities":  650.0,
    "Health & Fitness":   120.0,
    "Personal Care":       80.0,
    "Other":              540.5,
  },
  monthly: [
    { month: "2025-01", total: 480.0 },
    { month: "2025-02", total: 520.0 },
    { month: "2025-03", total: 610.0 },
    { month: "2025-04", total: 570.0 },
    { month: "2025-05", total: 490.0 },
    { month: "2025-06", total: 570.5 },
  ],
  topExpenses: [
    { title: "Rent",          amount: 1200, category: "Bills & Utilities" },
    { title: "Groceries",     amount: 320,  category: "Food & Dining" },
    { title: "Online shopping", amount: 280, category: "Shopping" },
  ],
};

const MOCK_FINANCIAL_CONTEXT = {
  ...MOCK_SPENDING_CONTEXT,
  estimatedMonthlyIncome: 4500,
  thisMonth:  570.5,
  lastMonth:  490.0,
  avgPerDay:  19.0,
  recurringExpenses: [
    { title: "Netflix",    category: "Entertainment",   monthlyEstimate: 15.99 },
    { title: "Gym",        category: "Health & Fitness", monthlyEstimate: 40.0 },
    { title: "Spotify",    category: "Entertainment",   monthlyEstimate: 9.99 },
  ],
  topCategories: [
    { category: "Food & Dining",     total: 820,  percentage: 25, monthlyAvg: 136 },
    { category: "Bills & Utilities", total: 650,  percentage: 20, monthlyAvg: 108 },
    { category: "Shopping",          total: 540,  percentage: 17, monthlyAvg: 90  },
  ],
};

const MOCK_CHAT_HISTORY = [
  { role: "user",      content: "How much did I spend last month?" },
  { role: "assistant", content: "Last month you spent $490.00 across all categories." },
];

// ── Runner ────────────────────────────────────────────────────────────────────

const agent = process.argv[2]?.toLowerCase();

if (!agent) {
  console.log("Usage: node test-agent.mjs <agent>");
  console.log("Agents: categorizer | pattern | savings | budget | chat");
  process.exit(0);
}

console.log(`\n🚀 Testing agent: ${agent}\n${"─".repeat(50)}`);
const start = Date.now();

try {
  let result;

  if (agent === "categorizer") {
    const { categorizeOne, categorizeBatch } = await import("./src/agents/categorizerAgent.js");

    console.log("→ Single categorization:", MOCK_EXPENSE.title);
    const single = await categorizeOne(MOCK_EXPENSE);
    console.log("Single result:", JSON.stringify(single, null, 2));

    console.log("\n→ Batch categorization:", MOCK_EXPENSES_BATCH.length, "items");
    const batch = await categorizeBatch(MOCK_EXPENSES_BATCH);
    console.log("Batch result:", JSON.stringify(batch, null, 2));
    result = { single, batch };

  } else if (agent === "pattern") {
    const { analyzePatterns } = await import("./src/agents/patternAnalyzerAgent.js");
    result = await analyzePatterns(MOCK_SPENDING_CONTEXT);
    console.log("Result:", JSON.stringify(result, null, 2));

  } else if (agent === "savings") {
    const { generateSavingsAdvice } = await import("./src/agents/savingsAdvisorAgent.js");
    result = await generateSavingsAdvice(MOCK_FINANCIAL_CONTEXT);
    console.log("Result:", JSON.stringify(result, null, 2));

  } else if (agent === "budget") {
    const { generateBudgetPlan } = await import("./src/agents/budgetPlannerAgent.js");
    result = await generateBudgetPlan(MOCK_FINANCIAL_CONTEXT);
    console.log("Result:", JSON.stringify(result, null, 2));

  } else if (agent === "chat") {
    const { processChat } = await import("./src/agents/chatAgent.js");
    const message = "Can I afford to buy a $500 laptop this month?";
    console.log("→ User message:", message);
    console.log("→ History turns:", MOCK_CHAT_HISTORY.length);
    result = await processChat(message, MOCK_CHAT_HISTORY, MOCK_FINANCIAL_CONTEXT);
    console.log("\nAI Response:\n", result);

  } else {
    console.error(`❌ Unknown agent: "${agent}"`);
    console.log("Valid options: categorizer | pattern | savings | budget | chat");
    process.exit(1);
  }

  console.log(`\n✅ Done in ${Date.now() - start}ms`);

} catch (err) {
  console.error(`\n❌ Agent failed: ${err.message}`);
  if (err.statusCode) console.error(`   Status: ${err.statusCode}`);
  process.exit(1);
}
