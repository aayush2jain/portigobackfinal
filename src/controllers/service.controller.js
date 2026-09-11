const mongoose = require("mongoose");

const CreatorProfile = require("../models/CreatorProfile");
const Service = require("../models/Service");
const { recordServiceClick } = require("../services/analytics.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

const servicePopulate = {
  path: "creator",
  select: "username displayName avatar ratingAverage ratingCount user",
  populate: { path: "user", select: "name avatar" }
};

const canManageService = async (service, user) => {
  if (user.role === "admin") {
    return true;
  }

  const profile = await CreatorProfile.findOne({ user: user._id });
  return profile && service.creator.toString() === profile._id.toString();
};

// Creates a paid service for the authenticated creator.

const createService = catchAsync(async (req, res) => {
  const creator = await CreatorProfile.findOne({
    user: req.user._id,
  });

  if (!creator) {
    throw new ApiError(404, "Creator profile not found");
  }

  const service = await Service.create({
    creator: creator._id,
    type: req.body.type,
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    duration: req.body.duration,
    deliveryTime: req.body.deliveryTime,
  });

  sendResponse(res, 201, "Service created successfully", {
    service,
  });
});

// Lists active public services with optional type, creator, and search filters.
const listServices = catchAsync(async (req, res) => {
  const query = { status: "active" };

  if (req.query.type) {
    query.type = req.query.type;
  }

  if (req.query.creator) {
    const creatorOptions = [{ username: String(req.query.creator).toLowerCase() }];

    if (mongoose.isValidObjectId(req.query.creator)) {
      creatorOptions.push({ _id: req.query.creator });
    }

    const creator = await CreatorProfile.findOne({
      $or: creatorOptions,
      isPublished: true
    });

    if (!creator) {
      sendResponse(res, 200, "Services fetched successfully", { services: [] });
      return;
    }

    query.creator = creator._id;
  }

  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  const services = await Service.find(query)
    .populate(servicePopulate)
    .sort({ isFeatured: -1, createdAt: -1 });

  sendResponse(res, 200, "Services fetched successfully", { services });
});

// Returns one service and records a click for public active services.
const getService = catchAsync(async (req, res) => {
  const service = await Service.findById(req.params.id).populate(servicePopulate);

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  const isOwner =
    req.user &&
    service.creator?.user?._id &&
    service.creator.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user?.role === "admin";

  if (service.status !== "active" && !isOwner && !isAdmin) {
    throw new ApiError(404, "Service not found");
  }

  if (service.status === "active" && !isOwner) {
    await recordServiceClick(service.creator._id);
  }

  sendResponse(res, 200, "Service fetched successfully", { service });
});

const deleteService = catchAsync(async (req, res) => {
  const creator = await CreatorProfile.findOne({
    user: req.user._id,
  });

  const service = await Service.findOne({
    _id: req.params.id,
    creator: creator._id,
  });

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  await service.deleteOne();

  sendResponse(res, 200, "Service deleted");
});

// Updates a creator-owned service.
const updateService = catchAsync(async (req, res) => {
  const creator = await CreatorProfile.findOne({
    user: req.user._id,
  });

  const service = await Service.findOne({
    _id: req.params.id,
    creator: creator._id,
  });

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  const allowedUpdates = [
    "title",
    "description",
    "type",
    "price",
    "duration",
    "deliveryTime",
    "status",
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      service[field] = req.body[field];
    }
  });

  await service.save();

  sendResponse(
    res,
    200,
    "Service updated successfully",
    {
      service,
    }
  );
});
// Records an explicit service click event for analytics.
const trackServiceClick = catchAsync(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, status: "active" });

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  await recordServiceClick(service.creator);

  sendResponse(res, 200, "Service click recorded");
});
const getMyServices = catchAsync(async (req, res) => {
  const creator = await CreatorProfile.findOne({
    user: req.user._id,
  });

  if (!creator) {
    throw new ApiError(404, "Creator profile not found");
  }

  const services = await Service.find({
    creator: creator._id,
  }).sort({
    createdAt: -1,
  });

  sendResponse(res, 200, "Services fetched", {
    services,
  });
});

module.exports = {
  createService,
  listServices,
  getService,
  getMyServices,
  updateService,
  deleteService,
  trackServiceClick
};
