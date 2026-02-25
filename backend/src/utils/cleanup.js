import User from "../models/user.model.js";

export const clearExpiredResetTokens = async () => {
  try {
    const result = await User.updateMany(
      { resetTokenExpires: { $lt: new Date() } },
      { $unset: { resetToken: "", resetTokenExpires: "" } },
    );

    // Optional: use logger for internal tracking
    // if (result.modifiedCount > 0) {
    //   logger.info("Removed expired reset tokens", { count: result.modifiedCount });
    // }
  } catch {
    // Production-safe: do not log raw error
    // logger.error("Error clearing expired reset tokens", { error: err });
    // Or leave empty if you prefer silent failure
  }
};
