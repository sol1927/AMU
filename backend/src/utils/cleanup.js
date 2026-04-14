import User from "../models/user.model.js";

export const clearExpiredResetTokens = async () => {
  try {
    await User.updateMany(
      { resetTokenExpires: { $lt: new Date() } },
      { $unset: { resetToken: "", resetTokenExpires: "" } },
    );
  } catch {
  }
};
