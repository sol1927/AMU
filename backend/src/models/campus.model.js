import mongoose from "mongoose";

const campusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    location: {
      type: String, // optional
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    logo: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true },
);

// Ensure each admin cannot create campuses with duplicate names
campusSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export default mongoose.model("Campus", campusSchema);
