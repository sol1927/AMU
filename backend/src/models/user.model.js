import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: String,
    role: {
      type: String,
      default: "admin",
    },

    // --- For password reset ---
    resetToken: String, // temporary token sent via email
    resetTokenExpires: Date, // token expiration time
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
