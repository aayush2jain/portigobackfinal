const express = require("express");
const { param } = require("express-validator");

const {
  getCreatorAnalyticsById,
  getMyAnalytics
} = require("../controllers/analytics.controller");
const { authenticate, requireCreatorProfile } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = express.Router();

router.get("/me", authenticate, requireCreatorProfile, getMyAnalytics);

router.get(
  "/creator/:creatorId",
  authenticate,
  [param("creatorId").isMongoId().withMessage("Valid creator id is required")],
  validate,
  getCreatorAnalyticsById
);

module.exports = router;
