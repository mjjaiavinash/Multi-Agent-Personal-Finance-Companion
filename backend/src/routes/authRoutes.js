import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ─── Validation Chains ────────────────────────────────────────────────────────

const registerValidators = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters."),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email.")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),
];

const loginValidators = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email.")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required."),
];

const updateProfileValidators = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters."),
  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Please provide a valid email.")
    .normalizeEmail(),
  body("newPassword")
    .optional()
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("New password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("New password must contain at least one number."),
];

// ─── Public Routes ────────────────────────────────────────────────────────────

router.post("/register",
  authLimiter,
  registerValidators,
  validate,
  authController.register
);

router.post("/login",
  authLimiter,
  loginValidators,
  validate,
  authController.login
);

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.post("/logout",
  authMiddleware,
  authController.logout
);

router.get("/profile",
  authMiddleware,
  authController.getProfile
);

router.put("/profile",
  authMiddleware,
  updateProfileValidators,
  validate,
  authController.updateProfile
);

export default router;
