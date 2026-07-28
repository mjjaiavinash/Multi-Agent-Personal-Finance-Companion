import api from "./axiosInstance";

/**
 * Fetches Gemini-powered finance analysis (summary, topCategory, recommendations).
 * Maps to GET /api/v1/ai/analysis
 */
export const getAIAnalysis = () => api.get("/ai/analysis");

/**
 * Fetches full spending pattern analysis (4 dimensions, cached 30 min).
 * Maps to GET /api/v1/ai/patterns
 *
 * @param {number}  months       - History window (1–12)
 * @param {boolean} forceRefresh - Bypass cache
 */
export const getAIPatterns = (months = 6, forceRefresh = false) =>
  api.get("/ai/patterns", { params: { months, refresh: forceRefresh } });

/**
 * Fetches AI spending predictions (next week, next month, category forecast, confidence).
 * Maps to GET /api/v1/ai/predict
 *
 * @param {number}  months       - History window (1–12)
 * @param {boolean} forceRefresh - Bypass cache
 */
export const getAIPredictions = (months = 6, forceRefresh = false) =>
  api.get("/ai/predict", { params: { months, refresh: forceRefresh } });

/**
 * Sends a chat message to the finance AI agent.
 * Maps to POST /api/v1/ai/chat
 *
 * @param {string} message  - User's message
 * @param {Array}  history  - Gemini-format conversation history [{role, parts}]
 */
export const sendChatMessage = (message, history = []) =>
  api.post("/ai/chat", { message, history });
