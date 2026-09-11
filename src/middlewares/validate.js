const { validationResult } = require("express-validator");

const ApiError = require("../utils/ApiError");

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((clean, [key, nestedValue]) => {
      if (key.startsWith("$") || key.includes(".")) {
        return clean;
      }

      clean[key] = sanitizeValue(nestedValue);
      return clean;
    }, {});
  }

  return value;
};

// Removes MongoDB operator-like keys from user input before controllers use it.
const sanitizeInput = (req, _res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

// Converts express-validator failures into the shared API error shape.
const validate = (req, _res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  next(
    new ApiError(
      422,
      "Validation failed",
      errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    )
  );
};

module.exports = {
  sanitizeInput,
  validate
};
