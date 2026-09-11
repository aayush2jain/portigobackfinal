const crypto = require("crypto");
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true
    },
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
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
      index: true
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true
    },
    razorpayPaymentId: String,
    razorpaySignature: String,
    receiptUrl: {
      type: String,
      default: ""
    },
    paymentDetails: {
      verifiedAt: Date,
      failureReason: String,
      providerResponse: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ creator: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Creates a stable, human-readable receipt/order number before validation.
orderSchema.pre("validate", function assignOrderNumber() {
  if (!this.orderNumber) {
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.orderNumber = `PTG-${Date.now()}-${suffix}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);
