const express = require("express");
const { body, param, query } = require("express-validator");

const {
  createService,
  deleteService,
  getMyServices,
  getService,
  listServices,
  trackServiceClick,
  updateService,

} = require("../controllers/service.controller");
const { authenticate, optionalAuthenticate, requireCreatorProfile } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = express.Router();

const serviceValidators = [
  body("type").isIn(["messaging", "video_call", "deliverable"]).withMessage("Invalid service type"),
  body("title").trim().isLength({ min: 3, max: 120 }).withMessage("Title must be 3 to 120 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 3000 })
    .withMessage("Description must be 10 to 3000 characters"),
  body("price").isFloat({ gt: 0 }).toFloat().withMessage("Price must be greater than zero"),
  body("duration").optional().isInt({ min: 0 }).toInt(),
  body("deliveryTime").optional().isInt({ min: 0 }).toInt(),
  body("status").optional().isIn(["active", "inactive", "archived"]),
  body("isFeatured").optional().isBoolean().toBoolean(),
  body("metadata").optional().isObject()
];

router.get(
  "/",
  [
    query("type").optional().isIn(["messaging", "video_call", "deliverable"]),
    query("creator").optional().isString().trim(),
    query("search").optional().isString().trim().isLength({ max: 120 })
  ],
  validate,
  listServices
);

router.get("/me", authenticate,getMyServices);


router.post("/", authenticate, createService);

router.post(
  "/:id/click",
  [param("id").isMongoId().withMessage("Valid service id is required")],
  validate,
  trackServiceClick
);

router.get(
  "/:id",
  optionalAuthenticate,
  [param("id").isMongoId().withMessage("Valid service id is required")],
  validate,
  getService
);

router.patch(
  "/:id",
  authenticate,
  updateService
);

router.delete(
  "/:id",
  authenticate,
  deleteService
);

module.exports = router;
