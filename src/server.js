require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");
console.log(process.env.PORT);
console.log(process.env.MONGODB_URI);
const port = Number(process.env.PORT || 5000);

// Boots the database connection before accepting HTTP traffic.
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(port, () => {
      console.log(`Portigo API listening on port ${port}`);
    });

    process.on("unhandledRejection", (error) => {
      console.error("Unhandled rejection", error);
      server.close(() => process.exit(1));
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception", error);
      server.close(() => process.exit(1));
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Closing server.");
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error("Failed to start Portigo API", error);
    process.exit(1);
  }
};

startServer();
