const express = require("express");
const { body, param } = require("express-validator");

const {
  addPortfolioImages,
  createPortfolio,
  deletePortfolio,
  deletePortfolioImage,
  getMyPortfolio,
  getPublicCreatorPortfolio,
  updatePortfolio
} = require("../controllers/portfolio.controller");
const { authenticate, requireCreatorProfile } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { sanitizeInput, validate } = require("../middlewares/validate");

const router = express.Router();

const portfolioValidators = [
  body("title").trim().isLength({ min: 3, max: 140 }).withMessage("Title must be 3 to 140 characters"),
  body("description").optional().trim().isLength({ max: 3000 }).withMessage("Description cannot exceed 3000 characters"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*").optional().trim().isLength({ min: 1, max: 60 }),
  body("projectUrl").optional({ values: "falsy" }).isURL().withMessage("Project URL must be valid"),
  body("images").optional().isArray().withMessage("Images must be an array")
];

router.post("/", authenticate, requireCreatorProfile, portfolioValidators, validate, createPortfolio);

router.get("/me", authenticate, requireCreatorProfile, getMyPortfolio);

router.get(
  "/creator/:creatorId",
  [param("creatorId").isMongoId().withMessage("Valid creator id is required")],
  validate,
  getPublicCreatorPortfolio
);

router.patch(
  "/:id",
  authenticate,
  [
    param("id").isMongoId().withMessage("Valid portfolio id is required"),
    body("title").optional().trim().isLength({ min: 3, max: 140 }),
    body("description").optional().trim().isLength({ max: 3000 }),
    body("tags").optional().isArray(),
    body("projectUrl").optional({ values: "falsy" }).isURL()
  ],
  validate,
  updatePortfolio
);

router.delete(
  "/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Valid portfolio id is required")],
  validate,
  deletePortfolio
);

router.post(
  "/:id/images",
  authenticate,
  upload.array("images", 10),
  sanitizeInput,
  [
    param("id").isMongoId().withMessage("Valid portfolio id is required"),
    body("alt").optional().trim().isLength({ max: 160 }).withMessage("Alt text cannot exceed 160 characters")
  ],
  validate,
  addPortfolioImages
);

router.delete(
  "/:id/images",
  authenticate,
  [
    param("id").isMongoId().withMessage("Valid portfolio id is required"),
    body("publicId").isString().notEmpty().withMessage("publicId is required")
  ],
  validate,
  deletePortfolioImage
);

module.exports = router;
