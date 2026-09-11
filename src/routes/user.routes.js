const express = require("express");
const { body } = require("express-validator");

const { changePassword, getMe, updateMe } = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = express.Router();

router.use(authenticate);

router.get("/me", getMe);

router.patch(
  "/me",
  [
    body("name").optional().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2 to 80 characters"),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL")
  ],
  validate,
  updateMe
);

router.patch(
  "/change-password",
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
      .withMessage("New password must include uppercase, lowercase, number, and symbol")
  ],
  validate,
  changePassword
);

module.exports = router;
