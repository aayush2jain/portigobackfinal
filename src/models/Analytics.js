const mongoose = require("mongoose");

const dailyStatSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    profileViews: { type: Number, default: 0 },
    serviceClicks: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  { _id: false }
);

const monthlyRevenueSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    revenue: { type: Number, default: 0 }
  },
  { _id: false }
);

const analyticsSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreatorProfile",
      required: true,
      unique: true,
      index: true
    },
    profileViews: {
      type: Number,
      default: 0
    },
    serviceClicks: {
      type: Number,
      default: 0
    },
    purchases: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    dailyStats: {
      type: [dailyStatSchema],
      default: []
    },
    monthlyRevenue: {
      type: [monthlyRevenueSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analytics", analyticsSchema);
