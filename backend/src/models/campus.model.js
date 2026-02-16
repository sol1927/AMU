import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const campusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // never return password by default
    },
    location: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // admin who created this campus
    },
    logo: {
      url: String,
      public_id: String,
    },
    role: {
      type: String,
      enum: ["campus", "admin"], // enforce valid roles
      default: "campus",
      required: true,
    },
  },
  { timestamps: true },
);

// Ensure each admin cannot create campuses with duplicate names
campusSchema.index({ name: 1, createdBy: 1 }, { unique: true });

// Method to compare password
campusSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Optional: Hide password when converting to JSON
campusSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("Campus", campusSchema);
