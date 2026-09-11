const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const ApiError = require("../utils/ApiError");

const getRazorpaySecret = () => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "RAZORPAY_KEY_SECRET is not configured");
  }

  return process.env.RAZORPAY_KEY_SECRET;
};

// Creates a Razorpay order using paise because Razorpay expects the minor unit.
const createRazorpayOrder = async ({ amount, currency = "INR", receipt, notes = {}, transfers = [] }) => {
  if (!razorpay) {
    throw new ApiError(500, "Razorpay is not configured");
  }

  const payload = {
    amount: Math.round(Number(amount) * 100),
    currency,
    receipt,
    notes,
    payment_capture: 1
  };

  if (transfers.length) {
    payload.transfers = transfers.map((transfer) => ({
      account: transfer.account,
      amount: Math.round(Number(transfer.amount) * 100),
      currency: transfer.currency || currency,
      notes: transfer.notes || {},
      on_hold: Boolean(transfer.onHold)
    }));
  }

  return razorpay.orders.create(payload);
};

// Verifies Razorpay's HMAC signature in constant time where possible.
const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const expectedSignature = crypto
    .createHmac("sha256", getRazorpaySecret())
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");
  const received = Buffer.from(razorpaySignature || "", "hex");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

// Builds the receipt payload returned by the receipt endpoint.
const generateReceiptData = (order) => ({
  orderNumber: order.orderNumber,
  orderId: order._id,
  paymentId: order.razorpayPaymentId,
  status: order.status,
  amount: order.amount,
  currency: order.currency,
  service: order.service,
  customer: order.customer,
  creator: order.creator,
  paidAt: order.paymentDetails?.verifiedAt,
  createdAt: order.createdAt
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  generateReceiptData
};
