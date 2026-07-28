import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as aiService from "../services/aiService.js";
import * as predictionService from "../services/predictionService.js";

// GET /api/v1/ai/analysis
const getAnalysis = asyncHandler(async (req, res) => {
  const result = await aiService.getAIAnalysis(req.user._id);
  ApiResponse.ok(res, result, "AI analysis generated successfully.");
});

// GET /api/v1/ai/patterns?months=6&refresh=false
const getPatterns = asyncHandler(async (req, res) => {
  const months       = parseInt(req.query.months, 10) || 6;
  const forceRefresh = req.query.refresh === "true";
  const result       = await aiService.getPatterns(req.user._id, months, forceRefresh);
  ApiResponse.ok(res, result, "Pattern analysis retrieved.");
});

// GET /api/v1/ai/predict?months=6&refresh=false
const getPredictions = asyncHandler(async (req, res) => {
  const months       = parseInt(req.query.months, 10) || 6;
  const forceRefresh = req.query.refresh === "true";
  const result       = await predictionService.getSpendingPredictions(req.user._id, months, forceRefresh);
  ApiResponse.ok(res, result, "AI predictions generated successfully.");
});

// POST /api/v1/ai/chat
// Body: { message: string, history?: Array<{role, parts}> }
const chat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  console.log("[AIChatController] Processing chat for User ID:", req.user._id);
  const reply = await aiService.chat(req.user._id, message, history);
  ApiResponse.ok(res, { reply }, "Chat response generated.");
});

export { getAnalysis, getPatterns, getPredictions, chat };
