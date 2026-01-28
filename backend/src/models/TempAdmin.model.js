// models/TempAdmin.model.js
import mongoose from "mongoose";

const tempAdminSchema = new mongoose.Schema(
  {
    name: { type: String }, // optional at this point
    email: { type: String, required: true, unique: true },

    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true }, // OTP validity

    // ✅ NEW: OTP verification status
    verified: { type: Boolean, default: false },

    // ✅ NEW: when OTP was verified
    verifiedAt: { type: Date },
  },
  { timestamps: true }, // adds createdAt & updatedAt
);

// TTL index: auto delete after 24 hours
// Useful cleanup if registration never completes
tempAdminSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }, // 24 hours
);

export default mongoose.model("TempAdmin", tempAdminSchema);
