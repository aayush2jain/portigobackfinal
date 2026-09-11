const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreatorProfile",
      required: true,
      index: true
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    type: {
      type: String,
      enum: ["messaging", "video_call", "deliverable"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
      index: true
    },
    scheduledAt: Date,
    googleMeetUrl: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },
    deliverableInstructions: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    cancelledAt: Date,
    completedAt: Date
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ creator: 1, createdAt: -1 });
bookingSchema.index({ service: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
