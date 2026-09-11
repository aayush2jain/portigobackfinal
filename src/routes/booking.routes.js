const express = require("express");
const { body, param } = require("express-validator");

const {
  cancelBooking,
  completeBooking,
  createBooking,
  getBooking,
  getCreatorBookings,
  getMyBookings
} = require("../controllers/booking.controller");
const { authenticate, requireCreatorProfile } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/",
  authenticate,
  [
    body("serviceId").isMongoId().withMessage("Valid service id is required"),
    body("scheduledAt").optional().isISO8601().toDate().withMessage("scheduledAt must be a valid date"),
    body("message").optional().trim().isLength({ max: 3000 }).withMessage("Message cannot exceed 3000 characters"),
    body("deliverableInstructions")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Deliverable instructions cannot exceed 5000 characters")
  ],
  validate,
  createBooking
);

router.get("/me", authenticate, getMyBookings);

router.get("/creator", authenticate, requireCreatorProfile, getCreatorBookings);

router.get(
  "/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Valid booking id is required")],
  validate,
  getBooking
);

router.patch(
  "/:id/cancel",
  authenticate,
  [
    param("id").isMongoId().withMessage("Valid booking id is required"),
    body("reason").optional().trim().isLength({ max: 1000 }).withMessage("Reason cannot exceed 1000 characters")
  ],
  validate,
  cancelBooking
);

router.patch(
  "/:id/complete",
  authenticate,
  [param("id").isMongoId().withMessage("Valid booking id is required")],
  validate,
  completeBooking
);

module.exports = router;
