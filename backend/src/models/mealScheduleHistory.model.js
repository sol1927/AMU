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

const mealScheduleHistorySchema = new mongoose.Schema(
  {
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
      index: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      index: true,
    },
    breakfast: {
      type: mealTimeRangeSchema,
      required: true,
    },
    lunch: {
      type: mealTimeRangeSchema,
      required: true,
    },
    dinner: {
      type: mealTimeRangeSchema,
      required: true,
    },
  },
  { timestamps: true },
);

mealScheduleHistorySchema.index({ campusId: 1, effectiveFrom: -1 });

export default mongoose.model("MealScheduleHistory", mealScheduleHistorySchema);
