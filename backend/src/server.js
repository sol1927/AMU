import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    // Optionally use a logger instead of console
    // logger.info("MongoDB connected");
  })
  .catch(() => {
    // Fail fast if DB connection fails
    // logger.error("MongoDB connection failed");
    process.exit(1);
  });

// Start server
app.listen(PORT, () => {
  // Optional internal logging
  // logger.info(`Server running on port ${PORT}`);
});
