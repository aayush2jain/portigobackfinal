const Booking = require("../models/Booking");
const CreatorProfile = require("../models/CreatorProfile");
const Order = require("../models/Order");
const Service = require("../models/Service");
const {
  recordPurchase
} = require("../services/analytics.service");
const {
  sendBookingConfirmationEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail
} = require("../services/email.service");
const {
  createRazorpayOrder,
  generateReceiptData,
  verifyRazorpaySignature
} = require("../services/payment.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

const orderPopulate = [
  { path: "customer", select: "name email avatar" },
  {
    path: "creator",
    select: "username displayName avatar user",
    populate: { path: "user", select: "name email avatar" }
  },
  { path: "service" },
  { path: "booking" }
];

const buildReceiptUrl = (req, orderId) => {
  const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/api/v1/orders/${orderId}/receipt`;
};

const getEntityId = (value) => (value?._id ? value._id.toString() : value.toString());

const canAccessOrder = async (order, user) => {
  if (user.role === "admin") {
    return true;
  }

  if (getEntityId(order.customer) === user._id.toString()) {
    return true;
  }

  const profile = await CreatorProfile.findOne({ user: user._id });
  return profile && getEntityId(order.creator) === profile._id.toString();
};

const canManageOrderAsCreator = async (order, user) => {
  if (user.role === "admin") {
    return true;
  }

  const profile = await CreatorProfile.findOne({ user: user._id });
  return profile && getEntityId(order.creator) === profile._id.toString();
};

const buildMeetPlaceholder = () => `https://meet.google.com/portigo-${Date.now()}`;

// Creates a local order, Razorpay order, and pending booking for the selected service.
const createOrder = catchAsync(async (req, res) => {
  const service = await Service.findOne({ _id: req.body.serviceId, status: "active" });

  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  const creator = await CreatorProfile.findById(service.creator).select("+paymentDetails");

  if (!creator || !creator.isPublished) {
    throw new ApiError(404, "Creator profile not found");
  }

  if (creator.user.toString() === req.user._id.toString()) {
    throw new ApiError(400, "Creators cannot purchase their own services");
  }

  if (!creator.paymentDetails?.razorpayAccountId || !creator.paymentDetails?.isVerified) {
    throw new ApiError(400, "Creator payout account is not ready to receive payments");
  }

  if (service.type === "video_call" && !req.body.scheduledAt) {
    throw new ApiError(422, "scheduledAt is required for video call services");
  }

  const order = new Order({
    customer: req.user._id,
    creator: creator._id,
    service: service._id,
    amount: service.price,
    currency: req.body.currency || "INR"
  });

  await order.validate();

  const razorpayOrder = await createRazorpayOrder({
    amount: order.amount,
    currency: order.currency,
    receipt: order.orderNumber,
    notes: {
      customerId: req.user._id.toString(),
      creatorId: creator._id.toString(),
      serviceId: service._id.toString(),
      creatorRazorpayAccountId: creator.paymentDetails?.razorpayAccountId || ""
    },
    transfers: [
      {
        account: creator.paymentDetails.razorpayAccountId,
        amount: order.amount,
        currency: order.currency,
        notes: {
          creatorId: creator._id.toString(),
          serviceId: service._id.toString(),
          orderNumber: order.orderNumber
        }
      }
    ]
  });

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  const booking = await Booking.create({
    customer: req.user._id,
    creator: creator._id,
    service: service._id,
    order: order._id,
    type: service.type,
    scheduledAt: req.body.scheduledAt,
    googleMeetUrl: service.type === "video_call" ? buildMeetPlaceholder() : "",
    message: req.body.message,
    deliverableInstructions: req.body.deliverableInstructions,
    priceSnapshot: service.price
  });

  order.booking = booking._id;
  await order.save();

  const populatedOrder = await Order.findById(order._id).populate(orderPopulate);
  await sendOrderConfirmationEmail({
    customer: req.user,
    order: populatedOrder,
    service
  }).catch((error) => console.error("Order confirmation email failed", error));

  sendResponse(res, 201, "Order created successfully", {
    order: populatedOrder,
    payment: {
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    }
  });
});

// Verifies Razorpay payment signature, marks the order paid, confirms booking, and records revenue.
const verifyPayment = catchAsync(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const order = await Order.findById(orderId).populate(orderPopulate);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError(403, "You cannot verify this order");
  }

  if (order.razorpayOrderId !== razorpayOrderId) {
    throw new ApiError(400, "Razorpay order id does not match this order");
  }

  if (order.status === "paid") {
    sendResponse(res, 200, "Payment already verified", { order });
    return;
  }

  const isValidSignature = verifyRazorpaySignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  });

  if (!isValidSignature) {
    order.status = "failed";
    order.paymentDetails = {
      ...order.paymentDetails,
      failureReason: "Invalid Razorpay signature"
    };
    await order.save();
    throw new ApiError(400, "Invalid Razorpay signature");
  }

  order.status = "paid";
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  order.receiptUrl = buildReceiptUrl(req, order._id);
  order.paymentDetails = {
    ...order.paymentDetails,
    verifiedAt: new Date()
  };
  await order.save();

  if (order.booking) {
    await Booking.findByIdAndUpdate(order.booking._id || order.booking, { status: "confirmed" });
  }

  await recordPurchase(order.creator._id || order.creator, order.amount);

  const updatedOrder = await Order.findById(order._id).populate(orderPopulate);
  await Promise.all([
    sendPaymentSuccessEmail({
      customer: updatedOrder.customer,
      order: updatedOrder,
      service: updatedOrder.service
    }).catch((error) => console.error("Payment success email failed", error)),
    sendBookingConfirmationEmail({
      customer: updatedOrder.customer,
      creatorProfile: updatedOrder.creator,
      service: updatedOrder.service,
      booking: updatedOrder.booking
    }).catch((error) => console.error("Booking confirmation email failed", error))
  ]);

  sendResponse(res, 200, "Payment verified successfully", { order: updatedOrder });
});

// Returns all orders placed by the authenticated customer.
const getCustomerOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate(orderPopulate)
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "Customer orders fetched successfully", { orders });
});

// Returns all orders received by the authenticated creator.
const getCreatorOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ creator: req.creatorProfile._id })
    .populate(orderPopulate)
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "Creator orders fetched successfully", { orders });
});

// Returns one order if the requester is the customer, creator, or admin.
const getOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!(await canAccessOrder(order, req.user))) {
    throw new ApiError(403, "You cannot access this order");
  }

  await order.populate(orderPopulate);

  sendResponse(res, 200, "Order fetched successfully", { order });
});

// Updates order status for creators and admins.
const updateOrderStatus = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!(await canManageOrderAsCreator(order, req.user))) {
    throw new ApiError(403, "You cannot manage this order");
  }

  if (req.body.status === "paid" && !order.razorpayPaymentId) {
    throw new ApiError(400, "Use payment verification to mark an order as paid");
  }

  order.status = req.body.status;
  await order.save();
  await order.populate(orderPopulate);

  sendResponse(res, 200, "Order status updated successfully", { order });
});

// Returns a structured receipt for paid orders.
const getOrderReceipt = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(orderPopulate);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!(await canAccessOrder(order, req.user))) {
    throw new ApiError(403, "You cannot access this receipt");
  }

  if (order.status !== "paid") {
    throw new ApiError(400, "Receipt is available only after payment succeeds");
  }

  sendResponse(res, 200, "Receipt generated successfully", {
    receipt: generateReceiptData(order)
  });
});

module.exports = {
  createOrder,
  verifyPayment,
  getCustomerOrders,
  getCreatorOrders,
  getOrder,
  updateOrderStatus,
  getOrderReceipt
};
