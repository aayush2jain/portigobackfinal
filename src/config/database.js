const mongoose = require("mongoose");

// Opens the MongoDB connection once during server boot.
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  console.log("Connecting to MongoDB...",process.env.MONGODB_URI);

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  mongoose.set("strictQuery", true);

  const connection = await mongoose.connect(mongoUri, {
    autoIndex: process.env.NODE_ENV !== "production"
  });

  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};

module.exports = connectDB;
