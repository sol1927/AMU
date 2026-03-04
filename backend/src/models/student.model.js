import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profileUrl: { type: String, trim: true },
    profilePublicId: { type: String, trim: true },
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    batch: {
      type: Number,
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
    isInternship: { type: Boolean, default: false },
    fastingType: {
      type: String,
      enum: ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"],
      default: "not_fasting",
    },
    mealStatus: {
      breakfast: { type: Boolean, default: false },
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
