import mongoose from "mongoose";

export const requireDatabaseConnection = (_req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    message:
      "The server is reconnecting to the database. Please wait a moment and try again.",
  });
};
