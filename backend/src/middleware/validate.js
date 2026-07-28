import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * Run after express-validator chains.
 * Collects all validation errors and throws a 400 ApiError if any exist.
 */
const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw ApiError.badRequest("Validation failed.", messages);
  }
  next();
};

export default validate;
