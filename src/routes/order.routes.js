const express = require("express");
const { body, param } = require("express-validator");

const {
  createOrder,
  getCreatorOrders,
  getCustomerOrders,
  getOrder,
  getOrderReceipt,
  updateOrderStatus,
  verifyPayment
} = require("../controllers/order.controller");
const { authenticate, requireCreatorProfile } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/",
  authenticate,
  [
    body("serviceId").isMongoId().withMessage("Valid service id is required"),
    body("currency").optional().isIn(["INR"]).withMessage("Only INR is currently supported"),
    body("scheduledAt").optional().isISO8601().toDate().withMessage("scheduledAt must be a valid date"),
    body("message").optional().trim().isLength({ max: 3000 }).withMessage("Message cannot exceed 3000 characters"),
    body("deliverableInstructions")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Deliverable instructions cannot exceed 5000 characters")
  ],
  validate,
  createOrder
);

router.post(
  "/razorpay/verify",
  authenticate,
  [
    body("orderId").isMongoId().withMessage("Valid order id is required"),
    body("razorpayOrderId").isString().notEmpty().withMessage("razorpayOrderId is required"),
    body("razorpayPaymentId").isString().notEmpty().withMessage("razorpayPaymentId is required"),
    body("razorpaySignature").isString().notEmpty().withMessage("razorpaySignature is required")
  ],
  validate,
  verifyPayment
);

router.get("/customer", authenticate, getCustomerOrders);

router.get("/creator", authenticate, requireCreatorProfile, getCreatorOrders);

router.get(
  "/:id/receipt",
  authenticate,
  [param("id").isMongoId().withMessage("Valid order id is required")],
  validate,
  getOrderReceipt
);

router.get(
  "/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Valid order id is required")],
  validate,
  getOrder
);

router.patch(
  "/:id/status",
  authenticate,
  [
    param("id").isMongoId().withMessage("Valid order id is required"),
    body("status").isIn(["pending", "paid", "failed", "cancelled", "refunded"]).withMessage("Invalid order status")
  ],
  validate,
  updateOrderStatus
);

module.exports = router;
