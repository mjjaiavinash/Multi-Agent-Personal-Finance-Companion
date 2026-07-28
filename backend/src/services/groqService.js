import { groq }  from "../config/groq.js";
import env        from "../config/env.js";
import ApiError   from "../utils/ApiError.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL       = env.groqModel;
const TIMEOUT_MS  = parseInt(env.groqTimeoutMs,  10) || 30_000;
const MAX_RETRIES = parseInt(env.groqMaxRetries, 10) || 3;

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = {
  request: (fn, attempt) =>
    console.log(`[GroqService] ${fn} | attempt ${attempt}/${MAX_RETRIES} | model: ${MODEL}`),
  success: (fn, attempt, ms) =>
    console.log(`[GroqService] ${fn} succeeded | attempt ${attempt} | ${ms}ms`),
  retry: (fn, attempt, err, delay) =>
    console.warn(`[GroqService] ${fn} retrying | attempt ${attempt} | ${err.message} | delay: ${delay}ms`),
  failure: (fn, attempt, err) =>
    console.error(`[GroqService] ${fn} FAILED | attempt ${attempt} | ${err.message}`),
};

// ─── Error Classification ─────────────────────────────────────────────────────

/**
 * Returns true for transient errors that are safe to retry.
 * @param {Error} err
 */
const isRetryable = (err) => {
  if (err.name === "AbortError") return false;
  const status = err?.status ?? err?.statusCode;
  if (status === 413 || status === 429 || (status >= 500 && status <= 599)) return true;
  const msg = err.message?.toLowerCase() ?? "";
  return msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("network") || msg.includes("rate") || msg.includes("limit");
};

/**
 * Maps a raw Groq/network error to a user-facing ApiError.
 * @param {Error} err
 * @returns {ApiError}
 */
const toApiError = (err) => {
  const status = err?.status ?? err?.statusCode;
  if (err.name === "AbortError")  return new ApiError(504, "AI request timed out. Please try again.");
  if (status === 401 || status === 403) return new ApiError(401, "AI service authentication failed. Check your GROQ_API_KEY.");
  if (status === 404)             return new ApiError(502, "AI model not found. Check GROQ_MODEL in .env.");
  if (status === 413 || status === 429) return new ApiError(429, "AI rate limit reached. Please wait a moment and try again.");
  if (status >= 500)              return new ApiError(503, "AI service unavailable. Please try again shortly.");
  return ApiError.internal("AI service error. Please try again.");
};

// ─── Retry Engine ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const backoff = (attempt) =>
  Math.floor(Math.min(16_000, 1_000 * Math.pow(2, attempt)) + Math.random() * 1_000);

/**
 * Executes a Groq API call with timeout, retry, and structured logging.
 *
 * @param {() => Promise<string>} callFn  - Function that calls Groq and returns text
 * @param {string}                label   - Name used in logs
 * @returns {Promise<string>}             - Raw text from Groq
 * @throws {ApiError}
 */
const executeWithRetry = async (callFn, label) => {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    log.request(label, attempt);
    const start = Date.now();

    try {
      // Hard timeout via AbortController
      const controller = new AbortController();
      const timer = setTimeout(() => {
        const e = new Error(`${label} timed out after ${TIMEOUT_MS}ms`);
        e.name = "AbortError";
        controller.abort(e);
      }, TIMEOUT_MS);

      const text = await callFn(controller.signal).finally(() => clearTimeout(timer));
      log.success(label, attempt, Date.now() - start);
      return text;

    } catch (err) {
      lastErr = err;

      if (!isRetryable(err) || attempt === MAX_RETRIES) {
        log.failure(label, attempt, err);
        break;
      }

      const delay = backoff(attempt);
      log.retry(label, attempt, err, delay);
      await sleep(delay);
    }
  }

  throw toApiError(lastErr);
};

// ─── Groq Call Helpers ────────────────────────────────────────────────────────

/**
 * Sends a single prompt to Groq and returns the raw text response.
 * Used by all structured-JSON agents.
 *
 * @param {string} prompt
 * @param {Object} [options]
 * @param {number} [options.temperature=0.2]      - Lower = more deterministic JSON
 * @param {number} [options.maxTokens=8192]
 * @returns {Promise<string>}
 */
const generateText = (prompt, { temperature = 0.2, maxTokens = 8192 } = {}) =>
  executeWithRetry(
    async () => {
      const res = await groq.chat.completions.create({
        model:       MODEL,
        temperature,
        max_tokens:  maxTokens,
        messages:    [{ role: "user", content: prompt }],
      });
      return res.choices[0]?.message?.content ?? "";
    },
    "generateText"
  );

/**
 * Sends a prompt and parses the response as JSON.
 * Strips markdown code fences before parsing.
 * Throws ApiError(502) if the response is not valid JSON.
 *
 * @param {string} prompt
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
const generateJSON = async (prompt, options = {}) => {
  const raw = await generateText(prompt, options);
  try {
    return JSON.parse(raw.replace(/```json|```/gi, "").trim());
  } catch {
    throw new ApiError(502, "AI returned invalid JSON. Please try again.");
  }
};

/**
 * Sends a prompt for financial analysis with a slightly higher temperature
 * for more natural, varied responses.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
const generateAnalysis = (prompt) =>
  generateText(prompt, { temperature: 0.4, maxTokens: 4096 });

/**
 * Sends a multi-turn chat conversation to Groq.
 *
 * @param {Array<{role: string, content: string}>} messages - Full conversation history
 * @returns {Promise<string>}
 */
const generateChat = (messages) =>
  executeWithRetry(
    async () => {
      const res = await groq.chat.completions.create({
        model:       MODEL,
        temperature: 0.7,
        max_tokens:  2048,
        messages,
      });
      return res.choices[0]?.message?.content ?? "";
    },
    "generateChat"
  );

export { generateText, generateJSON, generateAnalysis, generateChat };
