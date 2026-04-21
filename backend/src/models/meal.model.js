import mongoose from "mongoose";

const mealWindowSchema = new mongoose.Schema(
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
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const mealSchema = new mongoose.Schema(
  {
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
    date: { type: Date, required: true },
    year: { type: Number, required: true },
    semester: {
      type: String,
      enum: ["first", "second"],
      required: true,
    },
    appliedWindow: mealWindowSchema,
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CafeStudent",
      },
    ],
  },
  { timestamps: true },
);

mealSchema.index({ campus: 1, date: 1, mealType: 1 }, { unique: true });

export default mongoose.model("Meal", mealSchema);
