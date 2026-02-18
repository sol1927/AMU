import mongoose from "mongoose";

const stationScanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD for session
  },
  { timestamps: true }
);

// Prevent duplicate scan for same student in same session
stationScanSchema.index({ student: 1, campus: 1, date: 1 }, { unique: true });

export default mongoose.model("StationScan", stationScanSchema);
