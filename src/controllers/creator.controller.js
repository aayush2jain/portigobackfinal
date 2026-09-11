const Analytics = require("../models/Analytics");
const CreatorProfile = require("../models/CreatorProfile");
const Order = require("../models/Order");
const Portfolio = require("../models/Portfolio");
const Service = require("../models/Service");
const User = require("../models/User");
const { ensureAnalytics, recordProfileView } = require("../services/analytics.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");
const {
  uploadImageBuffer,
  deleteCloudinaryAsset,
} = require(
  "../services/upload.service"
);
const sendResponse = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json(new ApiResponse(statusCode, message, data));

const recalculateRating = (profile) => {
  if (!profile.reviews.length) {
    profile.ratingAverage = 0;
    profile.ratingCount = 0;
    return;
  }

  const total = profile.reviews.reduce((sum, review) => sum + review.rating, 0);
  profile.ratingAverage = Number((total / profile.reviews.length).toFixed(2));
  profile.ratingCount = profile.reviews.length;
};

const getOrCreateProfile = async (userId) => {
  let profile = await CreatorProfile.findOne({ user: userId });

  if (!profile) {
    profile = await CreatorProfile.create({
      user: userId,
    });

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        role: "creator",
      }),
      ensureAnalytics(profile._id),
    ]);
  }

  return profile;
};
const updateBasicProfile = catchAsync(async (req, res) => {
  await getOrCreateProfile(req.user._id);

  const profile = await CreatorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        username: req.body.username,
        displayName: req.body.displayName,
        tagline: req.body.tagline,
        bio: req.body.bio,
        location: req.body.location,
        avatar: req.body.avatar,
        coverImage: req.body.coverImage,
        "onboarding.currentStep": 1,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  sendResponse(res, 200, "Basic profile updated", {
    profile,
  });
});
const updateSocialLinks = catchAsync(async (req, res) => {
  await getOrCreateProfile(req.user._id);

  const profile = await CreatorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        socialLinks: req.body.socialLinks,
        "onboarding.currentStep": 2,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  sendResponse(res, 200, "Social links updated", {
    profile,
  });
});
const updateSkills = catchAsync(async (req, res) => {
  await getOrCreateProfile(req.user._id);

  const profile = await CreatorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        skills: req.body.skills,
        categories: req.body.categories,
        "onboarding.currentStep": 3,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  sendResponse(res, 200, "Skills updated", {
    profile,
  });
});

const completeOnboarding = catchAsync(async (req, res) => {
  const profile = await CreatorProfile.findOneAndUpdate(
    {
      user: req.user._id,
    },
    {
      $set: {
        isPublished: true,
        "onboarding.completed": true,
        "onboarding.currentStep": 4,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!profile) {
    throw new ApiError(404, "Creator profile not found");
  }

  sendResponse(res, 200, "Onboarding completed successfully", {
    profile,
  });
});

// Returns the authenticated creator's own profile including private payment details.
const getMyCreatorProfile = catchAsync(async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id })
    .select("+paymentDetails")
    .populate("user", "name email avatar role");

  if (!profile) {
    throw new ApiError(404, "Creator profile not found");
  }

  sendResponse(res, 200, "Creator profile fetched successfully", { profile });
});
const loadProfile = catchAsync(async (req, res, next) => {
const profile = await CreatorProfile.findOne({
    user:req.user._id
}).lean();

const services = await Service.find({
    creator: profile?._id
}).lean();
sendResponse(res,200,"Creator fetched",{
    profile,
    services
});
})
// Updates the authenticated creator's editable profile fields.
const updateCreatorProfile =
  catchAsync(async (req, res) => {
    const updateData = {};

    const allowedFields = [
      "displayName",
      "username",
      "tagline",
      "bio",
      "location",
    ];

    allowedFields.forEach(
      (field) => {
        if (
          req.body[field] !==
          undefined
        ) {
          updateData[field] =
            req.body[field];
        }
      }
    );

    if (req.body.socialLinks) {
      const socials = [
        "linkedin",
        "twitter",
        "github",
        "instagram",
        "youtube",
        "website",
      ];

      socials.forEach(
        (social) => {
          if (
            req.body
              .socialLinks[
              social
            ] !== undefined
          ) {
            updateData[
              `socialLinks.${social}`
            ] =
              req.body
                .socialLinks[
                social
              ];
          }
        }
      );
    }

    let profile =
      await CreatorProfile.findOne(
        {
          user:
            req.user._id,
        }
      );

    if (!profile) {
      throw new ApiError(
        404,
        "Creator profile not found"
      );
    }

    // Upload new avatar
    if (req.file) {
      // delete old image
      if (
        profile.avatar
          ?.publicId
      ) {
        await deleteCloudinaryAsset(
          profile.avatar
            .publicId
        );
      }

      const uploaded =
        await uploadImageBuffer(
          req.file,
          "portigo/avatars"
        );

      updateData.avatar =
        {
          url:
            uploaded.url,
          optimizedUrl:
            uploaded.optimizedUrl,
          thumbnailUrl:
            uploaded.thumbnailUrl,
          publicId:
            uploaded.publicId,
        };
    }

    profile =
      await CreatorProfile.findOneAndUpdate(
        {
          user:
            req.user._id,
        },
        {
          $set:
            updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    sendResponse(
      res,
      200,
      "Profile updated successfully",
      {
        profile,
      }
    );
  });

// Publishes or unpublishes the authenticated creator page.
const publishMyCreatorProfile = catchAsync(async (req, res) => {
  req.creatorProfile.isPublished =
    req.body.isPublished === undefined ? true : Boolean(req.body.isPublished);
  await req.creatorProfile.save();

  sendResponse(res, 200, "Creator profile publication status updated", {
    profile: req.creatorProfile
  });
});

// Composes the public creator page with profile, portfolio, services, reviews, and stats.
const getPublicCreator = catchAsync(async (req, res) => {
  const profile =
    await CreatorProfile.findOne({
      username: req.params.username,
      isPublished: true,
    }).lean();

  if (!profile) {
    throw new ApiError(
      404,
      "Creator not found"
    );
  }

  const services =
    await Service.find({
      creator: profile._id,
      status: "active",
    });

  sendResponse(
    res,
    200,
    "Creator fetched",
    {
      profile,
      services,
      reviews: profile.reviews,
    }
  );
});

// Stores or updates a customer review after verifying a paid order exists.
const addCreatorReview = catchAsync(async (req, res) => {
  const profile = await CreatorProfile.findOne({
    username: req.params.username.toLowerCase(),
    isPublished: true
  });

  if (!profile) {
    throw new ApiError(404, "Creator page not found");
  }

  const paidOrder = await Order.exists({
    creator: profile._id,
    customer: req.user._id,
    status: "paid"
  });

  if (!paidOrder) {
    throw new ApiError(403, "Only customers with a paid order can review this creator");
  }

  const existingReview = profile.reviews.find(
    (review) => review.customer.toString() === req.user._id.toString()
  );

  if (existingReview) {
    existingReview.rating = req.body.rating;
    existingReview.comment = req.body.comment || "";
    existingReview.createdAt = new Date();
  } else {
    profile.reviews.push({
      customer: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment || ""
    });
  }

  recalculateRating(profile);
  await profile.save();
  await profile.populate("reviews.customer", "name avatar");

  sendResponse(res, 201, "Review saved successfully", {
    reviews: profile.reviews,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount
  });
});



module.exports = {
  getMyCreatorProfile,
  updateCreatorProfile,
  publishMyCreatorProfile,
  getPublicCreator,
  addCreatorReview,
  updateBasicProfile,
  getOrCreateProfile,
  updateSocialLinks,
  updateSkills,
  completeOnboarding,
  loadProfile,
};

