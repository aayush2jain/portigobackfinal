const express = require("express");
const { body, param } = require("express-validator");
const passport = require("passport");

const {
  forgotPassword,
  googleCallback,
  login,
  logout,
  refreshToken,
  register,
  resetPassword
} = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const ApiError = require("../utils/ApiError");

const router = express.Router();

const ensureGoogleStrategy = (_req, _res, next) => {
  if (!passport._strategy("google")) {
    next(new ApiError(500, "Google OAuth is not configured"));
    return;
  }

  next();
};

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
  ],
  validate,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  validate,
  login
);

router.get(
  "/google",
  ensureGoogleStrategy,
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })
);

router.get(
  "/google/callback",
  ensureGoogleStrategy,
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/login?error=google_oauth_failed`
  }),
  googleCallback
);

router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
  validate,
  forgotPassword
);

router.post(
  "/reset-password/:token",
  [
    param("token").isString().notEmpty().withMessage("Reset token is required"),
    body("password")
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
      .withMessage("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol")
  ],
  validate,
  resetPassword
);

router.post(
  "/refresh-token",
  [body("refreshToken").isString().notEmpty().withMessage("Refresh token is required")],
  validate,
  refreshToken
);

router.post("/logout", authenticate, logout);

module.exports = router;
