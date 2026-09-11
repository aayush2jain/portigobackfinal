require("dotenv").config();

const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const configurePassport = require("./config/passport");
const analyticsRoutes = require("./routes/analytics.routes");
const authRoutes = require("./routes/auth.routes");
const bookingRoutes = require("./routes/booking.routes");
const creatorRoutes = require("./routes/creator.routes");
const orderRoutes = require("./routes/order.routes");
const portfolioRoutes = require("./routes/portfolio.routes");
const serviceRoutes = require("./routes/service.routes");
const uploadRoutes = require("./routes/upload.routes");
const userRoutes = require("./routes/user.routes");
const { errorHandler, notFound } = require("./middlewares/errorHandler");
const { sanitizeInput } = require("./middlewares/validate");
const ApiError = require("./utils/ApiError");
const ApiResponse = require("./utils/ApiResponse");

const app = express();

configurePassport();

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new ApiError(403, "Origin is not allowed by CORS"));
  },
  credentials: true
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    errors: []
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
    errors: []
  }
});

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(apiLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(sanitizeInput);

app.get("/health", (_req, res) => {
  res.status(200).json(
    new ApiResponse(200, "Portigo API is healthy", {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  );
});

app.get("/api", (_req, res) => {
  res.status(200).json(
    new ApiResponse(200, "Portigo API v1", {
      docs: "Mount this backend behind the Portigo frontend and configure environment variables from .env.example"
    })
  );
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/creators", creatorRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
