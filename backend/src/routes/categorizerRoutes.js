import { Router }              from "express";
import { body, param }        from "express-validator";
import * as categorizerController from "../controllers/categorizerController.js";
import authMiddleware         from "../middleware/authMiddleware.js";
import validate               from "../middleware/validate.js";
import { aiLimiter }          from "../middleware/rateLimiter.js";
import { AGENT_CATEGORIES }   from "../agents/categorizerAgent.js";

const router = Router();

// All categorizer routes require auth + AI rate limit
router.use(authMiddleware);
router.use(aiLimiter);

// ─── Validation Chains ────────────────────────────────────────────────────────

const suggestValidators = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required.")
    .isLength({ min: 2, max: 100 }).withMessage("Title must be 2–100 characters."),
  body("amount")
    .notEmpty().withMessage("Amount is required.")
    .isFloat({ gt: 0 }).withMessage("Amount must be a positive number.")
    .toFloat(),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters."),
];

const batchValidators = [
  body("expenses")
    .isArray({ min: 1, max: 20 })
    .withMessage("expenses must be an array of 1–20 items."),
  body("expenses.*.id")
    .notEmpty().withMessage("Each expense must have an id."),
  body("expenses.*.title")
    .trim()
    .notEmpty().withMessage("Each expense must have a title.")
    .isLength({ min: 2, max: 100 }).withMessage("Each title must be 2–100 characters."),
  body("expenses.*.amount")
    .notEmpty().withMessage("Each expense must have an amount.")
    .isFloat({ gt: 0 }).withMessage("Each amount must be a positive number.")
    .toFloat(),
  body("expenses.*.notes")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters."),
];

const applyOneValidators = [
  param("expenseId")
    .isMongoId().withMessage("Invalid expense ID."),
  body("confidenceThreshold")
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage("confidenceThreshold must be between 0 and 1.")
    .toFloat(),
];

const applyAllValidators = [
  body("confidenceThreshold")
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage("confidenceThreshold must be between 0 and 1.")
    .toFloat(),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Suggest category for a single expense (no DB write)
router.post("/suggest",
  suggestValidators,
  validate,
  categorizerController.suggestCategory
);

// Suggest categories for a batch of expenses (no DB write)
router.post("/suggest/batch",
  batchValidators,
  validate,
  categorizerController.suggestBatch
);

// Apply AI category to one existing expense in DB
router.patch("/apply/:expenseId",
  applyOneValidators,
  validate,
  categorizerController.applyToExpense
);

// Bulk apply AI categories to all user expenses in DB
router.post("/apply/all",
  applyAllValidators,
  validate,
  categorizerController.applyToAllExpenses
);

export default router;
