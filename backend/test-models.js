import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const models = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-001",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-pro",
  "gemini-1.0-pro",
];

console.log("\n🔍 Testing all model names with your API key...\n");

for (const m of models) {
  try {
    const model = genAI.getGenerativeModel({ model: m });
    const r     = await model.generateContent("Reply with: OK");
    console.log(`✅  WORKS : ${m}  →  "${r.response.text().trim()}"`);
  } catch (e) {
    const msg = e.message ?? "";
    const statusMatch = msg.match(/\[(\d{3})/);
    const status = statusMatch ? statusMatch[1] : "???";
    console.log(`❌  FAIL  : ${m}  →  [${status}] ${msg.slice(0, 80)}`);
  }
}

console.log("\nDone.\n");
