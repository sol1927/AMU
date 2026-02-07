import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: {
      type: String,
      required: true,
      select: false, // 👈 this is the key
    },
    role: { type: String, default: "admin" },

    trustedDevices: [
      {
        deviceId: { type: String, required: true },
        deviceName: String,
        expiresAt: { type: Date, required: true },
      },
    ],
    deviceOtp: String,
    deviceOtpExpires: Date,
    pendingDevice: {
      deviceId: String,
      deviceName: String,
    },
    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
