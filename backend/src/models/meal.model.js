import mongoose from "mongoose";

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
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
  },
  { timestamps: true },
);

mealSchema.index({ campus: 1, date: 1, mealType: 1 }, { unique: true });

export default mongoose.model("Meal", mealSchema);
