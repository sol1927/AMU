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
    loginAttempts: {
      type: Number,
      default: 0,
      required: true,
    },
    lockUntil: {
      type: Number,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    location: {
      type: String,
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
    role: {
      type: String,
      enum: ["campus", "admin"],
      default: "campus",
      required: true,
    },
  },
  { timestamps: true },
);

campusSchema.index({ name: 1, createdBy: 1 }, { unique: true });

campusSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

campusSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("Campus", campusSchema);
