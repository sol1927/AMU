import User from "../models/user.model.js"; // adjust path if needed

// Function to clear expired password reset tokens
export const clearExpiredResetTokens = async () => {
  try {
    const result = await User.updateMany(
      { resetTokenExpires: { $lt: new Date() } }, // expired tokens
      { $unset: { resetToken: "", resetTokenExpires: "" } }, // remove fields
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Cleanup] Removed expired reset tokens for ${result.modifiedCount} user(s)`,
      );
    }
  } catch (err) {
    console.error("[Cleanup] Error clearing expired reset tokens:", err);
  }
};
