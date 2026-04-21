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
    campusId: {
      type: Number,
      required: true,
      index: true,
    },
    cafe: {
      type: Number,
      enum: [-1, 0, 1],
      default: 0,
      index: true,
    },
    isInternship: { type: Boolean, default: false },
    fastingType: {
      type: String,
      enum: ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"],
      default: "not_fasting",
    },
    mealStatus: {
      type: {
        breakfast: { type: Boolean, default: false },
        lunch: { type: Boolean, default: false },
        dinner: { type: Boolean, default: false },
      },
      default: () => ({
        breakfast: false,
        lunch: false,
        dinner: false,
      }),
    },
  },
  {
    timestamps: true,
  },
);

const Student = mongoose.model("Student", studentSchema);
export default Student;
