import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profileUrl: { type: String, required: true, trim: true },
    profilePublicId: { type: String, trim: true }, // ✅ needed for Cloudinary deletion

    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    batch: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
    },
    mealStatus: {
      breakfast: { type: Boolean, default: false }, // false = not eaten yet
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  },
);

const Student = mongoose.model("Student", studentSchema);
export default Student;
