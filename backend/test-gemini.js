/**
 * Gemini API Key Test Script
 * Run: node test-gemini.js
 *
 * Loads GEMINI_API_KEY from .env, sends a minimal prompt,
 * and reports whether the key is valid and working.
 */

import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const KEY   = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// ─── Validation ───────────────────────────────────────────────────────────────

if (!KEY) {
  console.error("\n❌  GEMINI_API_KEY is not set in your .env file.\n");
  process.exit(1);
}

console.log("\n🔑  Key found :", KEY.slice(0, 8) + "..." + KEY.slice(-4));
console.log("🤖  Model     :", MODEL);
console.log("⏳  Testing connection...\n");

// ─── Test Call ────────────────────────────────────────────────────────────────

try {
  const genAI = new GoogleGenerativeAI(KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const start  = Date.now();
  const result = await model.generateContent("Reply with exactly: OK");
  const reply  = result.response.text().trim();
  const ms     = Date.now() - start;

  console.log("✅  API key is VALID and working.");
  console.log(`📨  Response  : "${reply}"`);
  console.log(`⚡  Latency   : ${ms}ms\n`);

} catch (err) {
  const msg = err.message ?? "";

  // Parse the HTTP status from the SDK error message
  const statusMatch = msg.match(/\[(\d{3})/);
  const status      = statusMatch ? parseInt(statusMatch[1], 10) : null;

  console.error("❌  API key test FAILED.\n");

  if (status === 400) {
    console.error("   Reason : Bad request — the model name may be invalid.");
    console.error(`   Model  : ${MODEL}`);
  } else if (status === 401 || status === 403) {
    console.error("   Reason : Invalid or expired API key.");
    console.error("   Fix    : Get a new key at https://aistudio.google.com/app/apikey");
  } else if (status === 429) {
    console.error("   Reason : Rate limit exceeded — but the key itself is valid.");
    console.error("   Fix    : Wait a minute and try again.");
  } else if (status >= 500) {
    console.error("   Reason : Gemini server error — not your key's fault.");
    console.error("   Fix    : Try again in a few minutes.");
  } else {
    console.error("   Reason :", msg);
  }

  console.error(`\n   Raw error: ${msg}\n`);
  process.exit(1);
}
