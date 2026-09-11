const CreatorProfile = require("../models/CreatorProfile");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");
const { issueAuthTokens } = require("../utils/generateJWT");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

// Returns the authenticated user and their creator profile if one exists.
const getMe = catchAsync(async (req, res) => {
  const creatorProfile = await CreatorProfile.findOne({ user: req.user._id }).select("+paymentDetails");

  sendResponse(res, 200, "User fetched successfully", {
    user: req.user,
    creatorProfile
  });
});

// Updates safe user profile fields.
const updateMe = catchAsync(async (req, res) => {
  const allowedFields = ["name", "avatar"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });

  await req.user.save({ validateBeforeSave: true });

  sendResponse(res, 200, "User updated successfully", { user: req.user });
});

// Changes a password after verifying the current password and rotates tokens.
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password +refreshTokenHash");

  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  user.authProvider = "local";
  const tokens = await issueAuthTokens(user);

  sendResponse(res, 200, "Password changed successfully", { user, tokens });
});

module.exports = {
  getMe,
  updateMe,
  changePassword
};
