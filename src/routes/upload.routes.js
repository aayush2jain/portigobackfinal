const express = require("express");
const { body } = require("express-validator");

const {
  deleteUpload,
  uploadMultiple,
  uploadSingle
} = require("../controllers/upload.controller");
const { authenticate } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { sanitizeInput, validate } = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/single",
  authenticate,
  upload.single("image"),
  sanitizeInput,
  [body("folder").optional().trim().isLength({ max: 120 }).withMessage("Folder cannot exceed 120 characters")],
  validate,
  uploadSingle
);

router.post(
  "/multiple",
  authenticate,
  upload.array("images", 10),
  sanitizeInput,
  [body("folder").optional().trim().isLength({ max: 120 }).withMessage("Folder cannot exceed 120 characters")],
  validate,
  uploadMultiple
);

router.post(
  "/delete",
  authenticate,
  [body("publicId").isString().notEmpty().withMessage("publicId is required")],
  validate,
  deleteUpload
);

module.exports = router;
