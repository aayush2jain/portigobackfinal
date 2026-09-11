const CreatorProfile = require("../models/CreatorProfile");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { verifyAccessToken } = require("../utils/generateJWT");

const extractAccessToken = (req) => {
  // Prefer HttpOnly cookie
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // Fallback to Bearer token (useful for mobile apps or APIs)
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
};

// Authenticates requests using a JWT access token.
const authenticate = catchAsync(async (req, _res, next) => {
  const token = extractAccessToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication token is required");
  }

  const payload = verifyAccessToken(token);

  if (payload.type !== "access") {
    throw new ApiError(401, "Invalid access token");
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = user;

  next();
});

// Adds req.user when a valid token is present but does not require one.
const optionalAuthenticate = catchAsync(async (req, _res, next) => {
  const token = extractAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);

    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid token
  }

  next();
});

const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    next(new ApiError(403, "You are not allowed to perform this action"));
    return;
  }

  next();
};

// Loads the authenticated user's creator profile for creator-owned resources.
const requireCreatorProfile = catchAsync(async (req, _res, next) => {
  const creatorProfile = await CreatorProfile.findOne({ user: req.user._id }).select("+paymentDetails");

  if (!creatorProfile) {
    throw new ApiError(403, "Creator profile is required for this action");
  }

  req.creatorProfile = creatorProfile;
  next();
});

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
  requireCreatorProfile
};
