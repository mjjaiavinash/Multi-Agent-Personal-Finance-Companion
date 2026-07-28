import Groq from "groq-sdk";
import env  from "./env.js";

if (!env.groqApiKey) {
  console.error("[Groq] GROQ_API_KEY is missing. AI features will not work.");
  process.exit(1);
}

/**
 * Initialized Groq client — single instance shared across all services.
 * Model is read from env so it can be swapped without touching code.
 */
const groq = new Groq({ apiKey: env.groqApiKey });

export { groq };
