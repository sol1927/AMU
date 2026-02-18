import StationScan from "../models/stationScan.model.js";
import Student from "../models/student.model.js";

// Automatic + Manual Scan
export const scanStudentStation = async (req, res) => {
  try {
    const { studentId } = req.body;

    // Find student in this campus
    const student = await Student.findOne({
      studentId,
      campus: req.campus._id,
    }).select("name studentId department batch fastingType profileUrl");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if already scanned today
    const existing = await StationScan.findOne({
      student: student._id,
      campus: req.campus._id,
      date: today,
    });

    if (existing) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate",
        student,
      });
    }

    // Create scan record
    await StationScan.create({
      student: student._id,
      campus: req.campus._id,
      date: today,
    });

    res.json({
      allowed: true,
      message: "Allowed to Eat",
      student,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate",
      });
    }
    console.error(err);
    res.status(500).json({ message: "Scan failed" });
  }
};

// Clear session data
export const clearStationData = async (req, res) => {
  try {
    await StationScan.deleteMany({ campus: req.campus._id });
    res.json({ message: "Station data cleared. Students can eat again." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to clear station" });
  }
};
