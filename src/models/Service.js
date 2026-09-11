const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreatorProfile",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["messaging", "video_call", "deliverable"],
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,

      trim: true,

    },
    price: {
      type: Number,
   
      min: 1
    },
    duration: {
      type: Number,
      min: 0,
      default: 0
    },
    deliveryTime: {
      type: Number,
      min: 0,
      default: 0
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active"
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

serviceSchema.index({ creator: 1, status: 1 });
serviceSchema.index({ type: 1, status: 1 });
serviceSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Service", serviceSchema);
