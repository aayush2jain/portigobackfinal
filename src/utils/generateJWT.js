const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ApiError = require("./ApiError");

const getEnv = (key, fallback) => {
  const value = process.env[key] || fallback;

  if (!value) {
    throw new ApiError(500, `${key} is not configured`);
  }

  return value;
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Generates the short-lived token used to access protected routes.
const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "access"
    },
    getEnv("JWT_ACCESS_SECRET"),
    { expiresIn: getEnv("JWT_ACCESS_EXPIRES_IN", "15m") }
  );

// Generates the long-lived token used to rotate access tokens.
const generateRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh"
    },
    getEnv("JWT_REFRESH_SECRET"),
    { expiresIn: getEnv("JWT_REFRESH_EXPIRES_IN", "30d") }
  );

// Generates a password reset token that is also stored in hashed form.
const generatePasswordResetToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      type: "password-reset"
    },
    getEnv("JWT_RESET_SECRET"),
    { expiresIn: getEnv("JWT_RESET_EXPIRES_IN", "15m") }
  );

const verifyAccessToken = (token) => jwt.verify(token, getEnv("JWT_ACCESS_SECRET"));

const verifyRefreshToken = (token) => jwt.verify(token, getEnv("JWT_REFRESH_SECRET"));

const verifyPasswordResetToken = (token) => jwt.verify(token, getEnv("JWT_RESET_SECRET"));

// Issues and stores a rotated refresh token hash for the provided user.
const issueAuthTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  issueAuthTokens,
  hashToken
};
