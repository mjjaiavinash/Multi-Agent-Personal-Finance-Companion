import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import * as authService from "../services/authService.js";

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, monthlyIncome, monthlyBudget } = req.body;
  const result = await authService.register({ name, email, password, monthlyIncome, monthlyBudget });
  ApiResponse.created(res, result, "Account created successfully.");
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  ApiResponse.ok(res, result, "Login successful.");
});

// POST /api/v1/auth/logout  [protected]
const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  addToBlacklist(token);
  ApiResponse.ok(res, null, "Logged out successfully.");
});

// GET /api/v1/auth/profile  [protected]
const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id || req.user.id);
  ApiResponse.ok(res, { user });
});

// PUT /api/v1/auth/profile  [protected]
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, currentPassword, newPassword, monthlyIncome, monthlyBudget } = req.body;
  const user = await authService.updateProfile(req.user._id || req.user.id, {
    name,
    email,
    currentPassword,
    newPassword,
    monthlyIncome,
    monthlyBudget,
  });
  ApiResponse.ok(res, { user }, "Profile updated successfully.");
});

export { register, login, logout, getProfile, updateProfile };
