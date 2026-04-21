import mongoose from "mongoose";

const mealTimeRangeSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
      trim: true,
    },
    end: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const mealScheduleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      trim: true,
    },
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
      unique: true,
    },
    breakfast: {
      type: mealTimeRangeSchema,
      required: true,
      default: () => ({ start: "06:00", end: "09:00" }),
    },
    lunch: {
      type: mealTimeRangeSchema,
      required: true,
      default: () => ({ start: "11:00", end: "14:00" }),
    },
    dinner: {
      type: mealTimeRangeSchema,
      required: true,
      default: () => ({ start: "17:00", end: "20:00" }),
    },
  },
  { timestamps: true },
);

export default mongoose.model("MealSchedule", mealScheduleSchema);
