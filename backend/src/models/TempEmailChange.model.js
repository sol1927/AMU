import mongoose from "mongoose";

const tempEmailChangeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      unique: true, // one active OTP per user
    },
    newEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpires: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL auto delete
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("TempEmailChange", tempEmailChangeSchema);
