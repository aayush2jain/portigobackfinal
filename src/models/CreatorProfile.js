const mongoose = require("mongoose");

const socialLinksSchema = new mongoose.Schema(
  {
    website: String,
    linkedin: String,
    instagram: String,
    twitter: String,
    github: String,
    youtube: String
  },
  { _id: false }
);

const avatarSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    currentStep: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const creatorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true
    },

    // -------- STEP 1 --------

    username: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      match: [/^[a-z0-9_]+$/, "Invalid username"]
    },

    displayName: {
      type: String,
      trim: true,
      default: ""
    },

    tagline: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    location: {
      type: String,
      default: ""
    },

    avatar: {
      type: avatarSchema,
      default: {}
    },

    coverImage: {
      type: avatarSchema,
      default: {}
    },

    // -------- STEP 2 --------

    socialLinks: {
      type: socialLinksSchema,
      default: {}
    },

    // -------- STEP 3 --------

    skills: {
      type: [String],
      default: []
    },

    categories: {
      type: [String],
      default: []
    },

    // -------- STEP 4 --------

    isPublished: {
      type: Boolean,
      default: false
    },

    onboarding: {
      type: onboardingSchema,
      default: {}
    },

    // Analytics

    stats: {
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

      totalEarnings: {
        type: Number,
        default: 0
      }
    },

    rating: {
      average: {
        type: Number,
        default: 0
      },

      count: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true
  }
);

creatorProfileSchema.index({ username: 1 });

creatorProfileSchema.index({ categories: 1 });

module.exports = mongoose.model(
  "CreatorProfile",
  creatorProfileSchema
);