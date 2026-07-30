import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

/**
 * Register a new user.
 * Throws if email already exists.
 * @returns {{ user: Object, token: string }}
 */
const register = async ({ name, email, password, monthlyIncome = 0, monthlyBudget = 0 }) => {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.badRequest("Email is already registered.");

  const user  = await User.create({
    name: String(name || "").trim(),
    email: normalizedEmail,
    password,
    monthlyIncome: Number(monthlyIncome) || 0,
    monthlyBudget: Number(monthlyBudget) || 0,
  });
  const token = user.generateToken();

  return { user: user.toSafeObject(), token };
};

/**
 * Login with email + password.
 * Throws if credentials are invalid.
 * @returns {{ user: Object, token: string }}
 */
const login = async ({ email, password }) => {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  // Explicitly select password since schema has select: false
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) throw ApiError.unauthorized("Invalid email or password.");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized("Invalid email or password.");

  const token = user.generateToken();
  return { user: user.toSafeObject(), token };
};

/**
 * Get a user's profile by ID.
 * @returns {Object} Safe user object
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found.");
  return user.toSafeObject();
};

/**
 * Update name and/or email.
 * If newPassword is provided, currentPassword must be verified first.
 * @returns {Object} Updated safe user object
 */
const updateProfile = async (userId, { name, email, currentPassword, newPassword, monthlyIncome, monthlyBudget }) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw ApiError.notFound("User not found.");

  // Check for email conflict with another account
  if (email && email !== user.email) {
    const conflict = await User.findOne({ email });
    if (conflict) throw ApiError.badRequest("Email is already in use.");
    user.email = email;
  }

  if (name) user.name = name;
  if (typeof monthlyIncome !== "undefined" && monthlyIncome !== null) {
    user.monthlyIncome = Number(monthlyIncome);
  }
  if (typeof monthlyBudget !== "undefined" && monthlyBudget !== null) {
    user.monthlyBudget = Number(monthlyBudget);
  }

  // Password change flow
  if (newPassword) {
    if (!currentPassword) throw ApiError.badRequest("Current password is required to set a new password.");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw ApiError.badRequest("Current password is incorrect.");
    user.password = newPassword; // pre-save hook will re-hash
  }

  await user.save();
  return user.toSafeObject();
};

export { register, login, getProfile, updateProfile };
