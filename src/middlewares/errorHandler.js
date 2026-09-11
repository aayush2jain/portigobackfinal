const ApiError = require("../utils/ApiError");

const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const normalizeError = (err) => {
  if (err instanceof ApiError) {
    return err;
  }

  if (err.name === "ValidationError") {
    return new ApiError(
      422,
      "Validation failed",
      Object.values(err.errors).map((error) => ({
        field: error.path,
        message: error.message
      }))
    );
  }

  if (err.name === "CastError") {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return new ApiError(409, `${fields.join(", ") || "Resource"} already exists`);
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return new ApiError(401, "Invalid or expired token");
  }

  if (err.name === "MulterError") {
    return new ApiError(400, err.message);
  }

  return new ApiError(500, err.message || "Internal server error");
};

// Sends every error in Portigo's required response format.
const errorHandler = (err, _req, res, _next) => {
  const normalizedError = normalizeError(err);
  const statusCode = normalizedError.statusCode || 500;

  if (process.env.NODE_ENV !== "test") {
    console.error(normalizedError);
  }

  res.status(statusCode).json({
    success: false,
    message: normalizedError.message,
    errors: normalizedError.errors || []
  });
};

module.exports = {
  notFound,
  errorHandler
};
