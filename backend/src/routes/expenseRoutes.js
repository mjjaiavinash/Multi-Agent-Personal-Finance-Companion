import { Router }                from "express";
import { body, query, param }   from "express-validator";
import * as expenseController   from "../controllers/expenseController.js";
import authMiddleware           from "../middleware/authMiddleware.js";
import validate                 from "../middleware/validate.js";
import { CATEGORIES }           from "../models/Expense.js";

const router = Router();

// All expense routes require authentication
router.use(authMiddleware);

// ─── Validation Chains ────────────────────────────────────────────────────────

const createValidators = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required.")
    .isLength({ min: 2, max: 100 }).withMessage("Title must be 2–100 characters."),

  body("amount")
    .notEmpty().withMessage("Amount is required.")
    .isFloat({ gt: 0 }).withMessage("Amount must be a positive number.")
    .toFloat(),

  body("category")
    .notEmpty().withMessage("Category is required.")
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(", ")}.`),

  body("date")
    .optional()
    .isISO8601().withMessage("Date must be a valid ISO 8601 date.")
    .toDate(),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters."),
];

const updateValidators = [
  param("id")
    .isMongoId().withMessage("Invalid expense ID."),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Title must be 2–100 characters."),

  body("amount")
    .optional()
    .isFloat({ gt: 0 }).withMessage("Amount must be a positive number.")
    .toFloat(),

  body("category")
    .optional()
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(", ")}.`),

  body("date")
    .optional()
    .isISO8601().withMessage("Date must be a valid ISO 8601 date.")
    .toDate(),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters."),
];

const listValidators = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50.")
    .toInt(),

  query("category")
    .optional()
    .isIn(["", ...CATEGORIES]).withMessage("Invalid category filter."),

  query("startDate")
    .optional()
    .isISO8601().withMessage("startDate must be a valid ISO 8601 date."),

  query("endDate")
    .optional()
    .isISO8601().withMessage("endDate must be a valid ISO 8601 date."),

  query("sort")
    .optional()
    .isIn(["date", "-date", "amount", "-amount", "title", "-title", "createdAt", "-createdAt"])
    .withMessage("Invalid sort value."),
];

const idValidator = [
  param("id").isMongoId().withMessage("Invalid expense ID."),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Summary must be defined BEFORE /:id to avoid "summary" being treated as an id
router.get("/summary",
  expenseController.getExpenseSummary
);

router.get("/",
  listValidators,
  validate,
  expenseController.getExpenses
);

router.post("/",
  createValidators,
  validate,
  expenseController.createExpense
);

router.get("/:id",
  idValidator,
  validate,
  expenseController.getExpenseById
);

router.put("/:id",
  updateValidators,
  validate,
  expenseController.updateExpense
);

router.delete("/:id",
  idValidator,
  validate,
  expenseController.deleteExpense
);

export default router;
