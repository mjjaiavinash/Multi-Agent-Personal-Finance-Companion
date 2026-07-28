/**
 * ============================================================
 *  utils/responseFormatter.js — HTTP Response Formatter
 * ============================================================
 *
 *  Provides a unified, consistent HTTP response envelope for
 *  the entire SpendSense AI API. Every controller must use
 *  these functions — never call res.json() or res.status() directly.
 *
 *  Why a formatter?
 *   • Guarantees a consistent response shape across all endpoints
 *   • Frontend can rely on { success, message, data, errors } always
 *   • Centralises status code assignment — no magic numbers in controllers
 *   • Simplifies adding cross-cutting concerns (e.g. request ID, version)
 *
 *  Response envelope shape:
 *  {
 *    success:   boolean,         — true for 2xx, false for 4xx/5xx
 *    message:   string,          — human-readable description
 *    data:      any | null,      — payload (null on error responses)
 *    errors:    string[] | null, — validation/field errors (null on success)
 *    timestamp: string,          — ISO 8601 UTC timestamp of this response
 *    requestId: string | null    — from X-Request-ID header if present
 *  }
 *
 *  Exported functions:
 *    success(res, data, message, statusCode)     — 200/201/etc. responses
 *    created(res, data, message)                 — 201 Created shorthand
 *    noContent(res)                              — 204 No Content
 *    error(res, message, statusCode, errors)     — 4xx/5xx error responses
 *    validationError(res, errors, message)       — 422 validation failures
 *    notFound(res, message)                      — 404 shorthand
 *    unauthorized(res, message)                  — 401 shorthand
 *    forbidden(res, message)                     — 403 shorthand
 *    tooManyRequests(res, message)               — 429 shorthand
 *    serviceUnavailable(res, message)            — 503 shorthand
 *    fromApiError(res, apiError)                 — converts ApiError → response
 * ============================================================
 */

// ─── Envelope Builder ─────────────────────────────────────────────────────────

/**
 * Constructs the standard response envelope object.
 * Never sent directly — always passed to res.status(n).json(envelope).
 *
 * @param {boolean}       success   — Whether the request succeeded
 * @param {string}        message   — Human-readable status message
 * @param {any}           data      — Response payload (null on error)
 * @param {string[]|null} errors    — Array of error details (null on success)
 * @param {string|null}   requestId — X-Request-ID header value if present
 * @returns {object} Envelope
 */
const buildEnvelope = (success, message, data = null, errors = null, requestId = null) => ({
  success,
  message,
  data,
  errors,
  timestamp: new Date().toISOString(),
  ...(requestId ? { requestId } : {}),
});

/**
 * Extracts the X-Request-ID header from an Express response object (if set).
 * Pass null-safe — returns null if header is absent.
 *
 * @param {import("express").Response} res
 * @returns {string|null}
 */
const getRequestId = (res) => res.getHeader?.("X-Request-ID") ?? null;

// ─── Success Responses ────────────────────────────────────────────────────────

/**
 * Sends a 200 OK (or custom 2xx) response with a data payload.
 *
 * Usage:
 *   ResponseFormatter.success(res, { expenses }, "Expenses fetched successfully.");
 *   ResponseFormatter.success(res, { user }, "User created.", 201);
 *
 * @param {import("express").Response} res
 * @param {any}    data        — Payload to send in the `data` field
 * @param {string} [message]   — Human-readable success message
 * @param {number} [statusCode] — HTTP status (default: 200)
 */
const success = (res, data, message = "Success", statusCode = 200) => {
  return res
    .status(statusCode)
    .json(buildEnvelope(true, message, data, null, getRequestId(res)));
};

/**
 * Sends a 201 Created response.
 * Use after creating a new resource (POST endpoints).
 *
 * @param {import("express").Response} res
 * @param {any}    data
 * @param {string} [message]
 */
const created = (res, data, message = "Resource created successfully.") => {
  return success(res, data, message, 201);
};

/**
 * Sends a 204 No Content response.
 * Use for DELETE or PUT operations that return no body.
 *
 * @param {import("express").Response} res
 */
const noContent = (res) => {
  return res.status(204).send();
};

// ─── Error Responses ──────────────────────────────────────────────────────────

/**
 * Sends a generic error response with the specified HTTP status code.
 *
 * Handles all standard error scenarios:
 *  • 400 Bad Request
 *  • 401 Unauthorized
 *  • 403 Forbidden
 *  • 404 Not Found
 *  • 409 Conflict
 *  • 422 Unprocessable Entity
 *  • 429 Too Many Requests
 *  • 500 Internal Server Error
 *  • 502 Bad Gateway
 *  • 503 Service Unavailable
 *  • 504 Gateway Timeout
 *
 * Usage:
 *   ResponseFormatter.error(res, "Expense not found.", 404);
 *   ResponseFormatter.error(res, "Validation failed.", 400, ["title is required"]);
 *
 * @param {import("express").Response} res
 * @param {string}        message    — Human-readable error message
 * @param {number}        [statusCode] — HTTP status code (default: 500)
 * @param {string[]|null} [errors]   — Additional error details / field errors
 */
const error = (res, message = "An unexpected error occurred.", statusCode = 500, errors = null) => {
  return res
    .status(statusCode)
    .json(buildEnvelope(false, message, null, errors, getRequestId(res)));
};

/**
 * Sends a 422 Unprocessable Entity response for validation failures.
 *
 * Designed to work with express-validator's validationResult() array:
 *   const errs = validationResult(req).array().map(e => `${e.path}: ${e.msg}`);
 *   ResponseFormatter.validationError(res, errs);
 *
 * @param {import("express").Response} res
 * @param {string[]} errors  — Array of validation error messages
 * @param {string}   [message] — Top-level error description
 */
const validationError = (
  res,
  errors = [],
  message = "Validation failed. Please check the highlighted fields."
) => {
  return res
    .status(422)
    .json(buildEnvelope(false, message, null, errors, getRequestId(res)));
};

// ─── Named Shortcuts ──────────────────────────────────────────────────────────
// These shorthand functions cover the most common error scenarios
// so controllers stay concise without constructing HTTP codes manually.

/**
 * Sends a 404 Not Found response.
 *
 * @param {import("express").Response} res
 * @param {string} [message]
 */
const notFound = (res, message = "The requested resource was not found.") =>
  error(res, message, 404);

/**
 * Sends a 401 Unauthorized response.
 * Use when authentication credentials are missing or invalid.
 *
 * @param {import("express").Response} res
 * @param {string} [message]
 */
const unauthorized = (res, message = "Authentication required. Please log in.") =>
  error(res, message, 401);

/**
 * Sends a 403 Forbidden response.
 * Use when the authenticated user lacks permission for the resource.
 *
 * @param {import("express").Response} res
 * @param {string} [message]
 */
const forbidden = (res, message = "You do not have permission to access this resource.") =>
  error(res, message, 403);

/**
 * Sends a 429 Too Many Requests response.
 * Use for rate-limit hits (API throttle, Gemini quota exceeded).
 *
 * @param {import("express").Response} res
 * @param {string} [message]
 */
const tooManyRequests = (
  res,
  message = "Too many requests. Please wait a moment and try again."
) => error(res, message, 429);

/**
 * Sends a 503 Service Unavailable response.
 * Use when a downstream service (Gemini, MongoDB) is temporarily unavailable.
 *
 * @param {import("express").Response} res
 * @param {string} [message]
 */
const serviceUnavailable = (
  res,
  message = "Service temporarily unavailable. Please try again shortly."
) => error(res, message, 503);

// ─── ApiError Integration ─────────────────────────────────────────────────────

/**
 * Converts an ApiError instance directly into an HTTP response.
 *
 * Use this in your global error handler middleware to translate thrown
 * ApiErrors into the standardised envelope format automatically.
 *
 * Usage in errorHandler.js:
 *   if (err instanceof ApiError) {
 *     return ResponseFormatter.fromApiError(res, err);
 *   }
 *
 * @param {import("express").Response} res
 * @param {{ statusCode: number, message: string, errors?: string[] }} apiError
 */
const fromApiError = (res, apiError) => {
  const statusCode = apiError?.statusCode ?? 500;
  const message    = apiError?.message    ?? "An unexpected error occurred.";
  const errors     = apiError?.errors?.length ? apiError.errors : null;

  return res
    .status(statusCode)
    .json(buildEnvelope(false, message, null, errors, getRequestId(res)));
};

// ─── Paginated Response ───────────────────────────────────────────────────────

/**
 * Sends a paginated success response with metadata.
 *
 * Use for list endpoints that support pagination (GET /expenses, etc.)
 *
 * Response shape:
 *  {
 *    success: true,
 *    message: "...",
 *    data: { items: [...], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
 *  }
 *
 * @param {import("express").Response} res
 * @param {any[]}  items      — Array of result items
 * @param {object} pagination — { page, limit, total }
 * @param {string} [message]
 */
const paginated = (res, items, { page, limit, total }, message = "Data fetched successfully.") => {
  const totalPages = Math.ceil(total / limit);

  return success(
    res,
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    message,
    200
  );
};

// ─── Exports ──────────────────────────────────────────────────────────────────

const ResponseFormatter = {
  success,
  created,
  noContent,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  tooManyRequests,
  serviceUnavailable,
  fromApiError,
  paginated,
};

export {
  success,
  created,
  noContent,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  tooManyRequests,
  serviceUnavailable,
  fromApiError,
  paginated,
};

export default ResponseFormatter;
