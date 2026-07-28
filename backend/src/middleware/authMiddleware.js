import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/User.js";
import env from "../config/env.js";
import { isBlacklisted } from "../utils/tokenBlacklist.js";

const authMiddleware = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No token provided.");
  }

  const token = authHeader.split(" ")[1];

  // Reject logged-out tokens
  if (isBlacklisted(token)) {
    throw ApiError.unauthorized("Token has been invalidated. Please log in again.");
  }

  // Verify signature and expiry
  const decoded = jwt.verify(token, env.jwtSecret);

  // Confirm user still exists in DB (handles deleted accounts)
  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized("User no longer exists.");

  // Attach full safe user + raw token to request
  req.user  = user.toSafeObject();
  req.token = token;
  next();
});

export default authMiddleware;
