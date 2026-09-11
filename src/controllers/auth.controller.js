const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");
const {
  generatePasswordResetToken,
  hashToken,
  issueAuthTokens,
  verifyPasswordResetToken,
  verifyRefreshToken
} = require("../utils/generateJWT");
const {
  sendPasswordResetEmail,
  sendRegistrationEmail
} = require("../services/email.service");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

const parseResetExpiry = () => {
  const value = process.env.JWT_RESET_EXPIRES_IN || "15m";
  const match = value.match(/^(\d+)(m|h|d)$/);

  if (!match) {
    return Date.now() + 15 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[unit];

  return Date.now() + amount * multiplier;
};

// Registers a local user and immediately returns access and refresh tokens.
const register = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const user = await User.create({
    name:  "xyz",
    email: normalizedEmail,
    password,
    authProvider: "local"
  });

  const tokens = await issueAuthTokens(user);
  // await sendRegistrationEmail(user).catch((error) => console.error("Registration email failed", error));
  res.cookie("accessToken", tokens.accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

res.cookie("refreshToken", tokens.refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});
  sendResponse(res, 201, "Registration successful", {user});
});

// Authenticates a local user with email and password.
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tokens = await issueAuthTokens(user);

  sendResponse(res, 200, "Login successful", { user, tokens });
});

// Redirects Google OAuth users back to the frontend with freshly issued tokens.
const googleCallback = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Google authentication failed");
  }
  console.log("req.user", req.user)
  const tokens = await issueAuthTokens(req.user);
  console.log("tokens", tokens)
res.cookie("accessToken", tokens.accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

res.cookie("refreshToken", tokens.refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

res.redirect(`${process.env.FRONTEND_URL}/onboarding`);
  // const redirectBase = process.env.FRONTEND_URL || "http://localhost:3000";
  // const redirectUrl = new URL("/auth/oauth-success", redirectBase);
  // redirectUrl.searchParams.set("accessToken", tokens.accessToken);
  // redirectUrl.searchParams.set("refreshToken", tokens.refreshToken);

  // res.redirect(redirectUrl.toString());
});

// Starts a password reset flow without disclosing whether the email exists.
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordResetTokenHash +passwordResetExpires"
  );

  if (user) {
    const resetToken = generatePasswordResetToken(user);
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(parseResetExpiry());
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user, resetUrl).catch((error) =>
      console.error("Password reset email failed", error)
    );
  }

  sendResponse(res, 200, "If an account exists, a password reset email has been sent");
});

// Validates a reset token and stores the new password hash.
const resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const payload = verifyPasswordResetToken(token);

  if (payload.type !== "password-reset") {
    throw new ApiError(401, "Invalid password reset token");
  }

  const user = await User.findById(payload.sub).select(
    "+password +passwordResetTokenHash +passwordResetExpires +refreshTokenHash"
  );

  if (
    !user ||
    user.passwordResetTokenHash !== hashToken(token) ||
    !user.passwordResetExpires ||
    user.passwordResetExpires < new Date()
  ) {
    throw new ApiError(401, "Invalid or expired password reset token");
  }

  user.password = password;
  user.authProvider = "local";
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokenHash = undefined;
  await user.save();

  sendResponse(res, 200, "Password reset successful");
});

// Rotates a valid refresh token and returns a new token pair.
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError(400, "Refresh token is required");
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }
    throw error;
  }

  if (payload.type !== "refresh") {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");

  if (!user || user.refreshTokenHash !== hashToken(token)) {
    throw new ApiError(401, "Refresh token has been revoked");
  }

  const tokens = await issueAuthTokens(user);

  sendResponse(res, 200, "Token refreshed", { tokens });
});

// Revokes the stored refresh token for the current session.
const logout = catchAsync(async (req, res) => {
  req.user.refreshTokenHash = undefined;
  await req.user.save({ validateBeforeSave: false });

  sendResponse(res, 200, "Logout successful");
});

module.exports = {
  register,
  login,
  googleCallback,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
};
