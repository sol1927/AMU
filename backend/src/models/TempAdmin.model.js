import mongoose from "mongoose";

const tempAdminSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },

    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },

    verified: { type: Boolean, default: false },

    verifiedAt: { type: Date },
  },
  { timestamps: true },
);

tempAdminSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("TempAdmin", tempAdminSchema);
