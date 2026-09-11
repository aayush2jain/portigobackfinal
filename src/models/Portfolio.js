const mongoose = require("mongoose");

const portfolioImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    optimizedUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreatorProfile",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 140
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },
    images: {
      type: [portfolioImageSchema],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    projectUrl: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

portfolioSchema.index({ creator: 1, createdAt: -1 });
portfolioSchema.index({ tags: 1 });

module.exports = mongoose.model("Portfolio", portfolioSchema);
