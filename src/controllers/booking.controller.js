const Booking = require("../models/Booking");
const CreatorProfile = require("../models/CreatorProfile");
const Service = require("../models/Service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

const bookingPopulate = [
  { path: "customer", select: "name email avatar" },
  {
    path: "creator",
    select: "username displayName avatar user",
    populate: { path: "user", select: "name email avatar" }
  },
  { path: "service" },
  { path: "order" }
];

const buildMeetPlaceholder = () => `https://meet.google.com/portigo-${Date.now()}`;

const canAccessBooking = async (booking, user) => {
  if (user.role === "admin") {
    return true;
  }

  if (booking.customer.toString() === user._id.toString()) {
    return true;
  }

  const profile = await CreatorProfile.findOne({ user: user._id });
  return profile && booking.creator.toString() === profile._id.toString();
};

const canManageBookingAsCreator = async (booking, user) => {
  if (user.role === "admin") {
    return true;
  }

  const profile = await CreatorProfile.findOne({ user: user._id });
  return profile && booking.creator.toString() === profile._id.toString();
};

// Creates a booking request for an active service.
const createBooking = catchAsync(async (req, res) => {
  const service = await Service.findOne({ _id: req.body.serviceId, status: "active" });

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  const creator = await CreatorProfile.findById(service.creator);

  if (!creator || !creator.isPublished) {
    throw new ApiError(404, "Creator profile not found");
  }

  if (creator.user.toString() === req.user._id.toString()) {
    throw new ApiError(400, "Creators cannot book their own services");
  }

  if (service.type === "video_call" && !req.body.scheduledAt) {
    throw new ApiError(422, "scheduledAt is required for video call services");
  }

  const booking = await Booking.create({
    customer: req.user._id,
    creator: creator._id,
    service: service._id,
    type: service.type,
    scheduledAt: req.body.scheduledAt,
    googleMeetUrl: service.type === "video_call" ? buildMeetPlaceholder() : "",
    message: req.body.message,
    deliverableInstructions: req.body.deliverableInstructions,
    priceSnapshot: service.price
  });

  await booking.populate(bookingPopulate);

  sendResponse(res, 201, "Booking created successfully", { booking });
});

// Lists bookings created by the authenticated customer.
const getMyBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id })
    .populate(bookingPopulate)
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "Bookings fetched successfully", { bookings });
});

// Lists bookings received by the authenticated creator.
const getCreatorBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ creator: req.creatorProfile._id })
    .populate(bookingPopulate)
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "Creator bookings fetched successfully", { bookings });
});

// Returns one booking if the requester is the customer, creator, or admin.
const getBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (!(await canAccessBooking(booking, req.user))) {
    throw new ApiError(403, "You cannot access this booking");
  }

  await booking.populate(bookingPopulate);

  sendResponse(res, 200, "Booking fetched successfully", { booking });
});

// Cancels a pending or confirmed booking.
const cancelBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (!(await canAccessBooking(booking, req.user))) {
    throw new ApiError(403, "You cannot cancel this booking");
  }

  if (booking.status === "completed") {
    throw new ApiError(400, "Completed bookings cannot be cancelled");
  }

  booking.status = "cancelled";
  booking.cancellationReason = req.body.reason || "";
  booking.cancelledAt = new Date();
  await booking.save();
  await booking.populate(bookingPopulate);

  sendResponse(res, 200, "Booking cancelled successfully", { booking });
});

// Marks a booking complete. Only the creator or an admin can complete it.
const completeBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (!(await canManageBookingAsCreator(booking, req.user))) {
    throw new ApiError(403, "Only the creator can complete this booking");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Cancelled bookings cannot be completed");
  }

  booking.status = "completed";
  booking.completedAt = new Date();
  await booking.save();
  await booking.populate(bookingPopulate);

  sendResponse(res, 200, "Booking completed successfully", { booking });
});

module.exports = {
  createBooking,
  getMyBookings,
  getCreatorBookings,
  getBooking,
  cancelBooking,
  completeBooking
};
