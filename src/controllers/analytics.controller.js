const CreatorProfile = require("../models/CreatorProfile");
const { getCreatorAnalytics } = require("../services/analytics.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

// Returns analytics for the authenticated creator.
const getMyAnalytics = catchAsync(async (req, res) => {
  const analytics = await getCreatorAnalytics(req.creatorProfile._id);

  sendResponse(res, 200, "Analytics fetched successfully", { analytics });
});

// Returns creator analytics to the owning creator or an admin.
const getCreatorAnalyticsById = catchAsync(async (req, res) => {
  const profile = await CreatorProfile.findById(req.params.creatorId);

  if (!profile) {
    throw new ApiError(404, "Creator profile not found");
  }

  const isOwner = profile.user.toString() === req.user._id.toString();

  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(403, "You cannot access this analytics report");
  }

  const analytics = await getCreatorAnalytics(profile._id);

  sendResponse(res, 200, "Analytics fetched successfully", { analytics });
});

module.exports = {
  getMyAnalytics,
  getCreatorAnalyticsById
};
