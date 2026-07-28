import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Wrap non-ApiError instances
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message    = error.message || "Internal server error";
    error = new ApiError(statusCode, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = ApiError.badRequest(`${field} already exists.`);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest("Validation failed.", messages);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError")  error = ApiError.unauthorized("Invalid token.");
  if (err.name === "TokenExpiredError")  error = ApiError.unauthorized("Token expired.");

  const response = {
    success:    false,
    statusCode: error.statusCode,
    message:    error.message,
    ...(error.errors?.length && { errors: error.errors }),
    ...(env.isDev && { stack: err.stack }),
  };

  res.status(error.statusCode).json(response);
};

export default errorHandler;
