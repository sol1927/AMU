import StationScan from "../models/stationScan.model.js";
import Student from "../models/student.model.js";

export const scanStudentStation = async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await Student.findOne({
      studentId,
      campus: req.campus._id,
    }).select(
      "name studentId department batch fastingType profileUrl isInternship",
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.isInternship) {
      return res.json({
        allowed: false,
        message: "Internship students are not allowed to scan",
        student,
      });
    }

    const today = new Date().toISOString().split("T")[0];

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
    res.status(500).json({ message: "Scan failed" });
  }
};

export const getCampusDashboardStats = async (req, res) => {
  try {
    const campusId = req.campus._id;
    const today = new Date().toISOString().split("T")[0];

    const totalStudents = await Student.countDocuments({ campus: campusId });

    const servedStudents = await StationScan.countDocuments({
      campus: campusId,
      date: today,
    });

    const recentScansRaw = await StationScan.find({
      campus: campusId,
      date: today,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("student", "name");

    const recentScans = recentScansRaw.map((scan) => ({
      name: scan.student.name,
      time: scan.createdAt,
    }));

    res.json({
      totalStudents,
      servedStudents,
      pendingStudents: Math.max(totalStudents - servedStudents, 0),
      recentScans,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

export const clearStationData = async (req, res) => {
  try {
    await StationScan.deleteMany({ campus: req.campus._id });
    res.json({ message: "Station data cleared. Students can eat again." });
  } catch {
    res.status(500).json({ message: "Failed to clear station" });
  }
};
