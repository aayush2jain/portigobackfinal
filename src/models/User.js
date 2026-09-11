const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: {
      type: String,
      required() {
        return this.authProvider === "local";
      },
      minlength: 1,
      select: false
    },
    googleId: {
      type: String,
      index: true
    },
    avatar: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["customer", "creator", "admin"],
      default: "customer"
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    refreshTokenHash: {
      type: String,
      select: false
    },
    passwordResetTokenHash: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.refreshTokenHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.__v;
    return ret;
  }
});

// Hashes local account passwords before they are persisted.
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// Compares a plain password with the stored bcrypt hash.
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
