import mongoose from "mongoose";

const stationScanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CafeStudent",
      required: true,
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
    },
    date: { type: String, required: true },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
  },
  { timestamps: true },
);

stationScanSchema.index(
  { student: 1, campus: 1, date: 1, mealType: 1 },
  { unique: true },
);

export default mongoose.model("StationScan", stationScanSchema);
