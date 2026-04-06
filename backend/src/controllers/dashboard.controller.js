import Campus from "../models/campus.model.js";
import Student from "../models/student.model.js";
import StationScan from "../models/stationScan.model.js";

export const getAdminDashboard = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date().toISOString().split("T")[0];

    const campuses = await Campus.find({ createdBy: req.userId }).lean();

    let totalStudents = 0;
    let totalServed = 0;

    const campusesWithStats = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await Student.countDocuments({
          campus: campus._id,
        });
        const servedCount = await StationScan.countDocuments({
          campus: campus._id,
          date: today,
        });

        totalStudents += studentsCount;
        totalServed += servedCount;

        return {
          ...campus,
          students: studentsCount,
          served: servedCount,
        };
      }),
    );

    res.json({
      stats: {
        campuses: campuses.length,
        totalStudents,
        servedToday: totalServed,
        pendingStudents: Math.max(totalStudents - totalServed, 0),
      },
      campuses: campusesWithStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};
