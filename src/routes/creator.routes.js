const express = require("express");
const { body, param } = require("express-validator");
const upload = require("../config/multer");
const {
  addCreatorReview,
  updateBasicProfile,
  getOrCreateProfile,
  updateSocialLinks,
  updateSkills,
  completeOnboarding,
  getPublicCreator,
  getMyCreatorProfile,
  publishMyCreatorProfile,
  updateCreatorProfile,
  loadProfile
} = require("../controllers/creator.controller");
const { authenticate, requireCreatorProfile } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = express.Router();

const usernameValidator = (location = body) =>
  location("username")
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 40 })
    .matches(/^[a-z0-9_]+$/)
    .withMessage("Username must be 3 to 40 characters and contain only lowercase letters, numbers, or underscores");

const creatorProfileValidators = [
  usernameValidator(),
  body("displayName")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Display name must be 2 to 80 characters"),
  body("tagline").optional().trim().isLength({ max: 140 }).withMessage("Tagline cannot exceed 140 characters"),
  body("bio").optional().trim().isLength({ max: 2000 }).withMessage("Bio cannot exceed 2000 characters"),
  body("location").optional().trim().isLength({ max: 120 }).withMessage("Location cannot exceed 120 characters"),
  body("categories").optional().isArray().withMessage("Categories must be an array"),
  body("categories.*").optional().trim().isLength({ min: 1, max: 60 }),
  body("socialLinks").optional().isObject().withMessage("Social links must be an object"),
  body("paymentDetails").optional().isObject().withMessage("Payment details must be an object")
];


router.get("/me", authenticate, loadProfile);

router.patch(
  "/basic",
  authenticate,
  upload.single("avatar"),
  updateCreatorProfile
);

router.patch(
    "/socials",
    authenticate,
    updateSocialLinks
);

router.patch(
    "/skills",
    authenticate,
    updateSkills
);

router.post(
    "/complete",
    authenticate,
    completeOnboarding
);


router.patch(
  "/me",
  authenticate,
  updateCreatorProfile
);

router.patch(
  "/me/publish",
  authenticate,
  requireCreatorProfile,
  [body("isPublished").optional().isBoolean().toBoolean()],
  validate,
  publishMyCreatorProfile
);

router.post(
  "/:username/reviews",
  authenticate,
  [
    param("username").trim().toLowerCase().isLength({ min: 3, max: 40 }).matches(/^[a-z0-9_]+$/),
    body("rating").isInt({ min: 1, max: 5 }).toInt().withMessage("Rating must be between 1 and 5"),
    body("comment").optional().trim().isLength({ max: 1000 }).withMessage("Comment cannot exceed 1000 characters")
  ],
  validate,
  addCreatorReview
);

router.get(
  "/:username",
  getPublicCreator
);

module.exports = router;
