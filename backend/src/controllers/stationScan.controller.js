import StationScan from "../models/stationScan.model.js";
import Student from "../models/student.model.js";
import Meal from "../models/meal.model.js";
import {
  finalizeExpiredStationScans,
  getCurrentMealType,
  getCurrentSemester,
  getCurrentYear,
  getDayString,
} from "../utils/mealSession.js";

export const scanStudentStation = async (req, res) => {
  try {
    const { studentId } = req.body;

    await finalizeExpiredStationScans(req.campus._id);

    const currentMealType = getCurrentMealType();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = getDayString(today);

    if (!currentMealType) {
      return res.status(400).json({
        allowed: false,
        message: "Time is up / áˆ°á‹“á‰µ áŠ áˆá‰‹áˆ",
      });
    }

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

    const existingStationScan = await StationScan.findOne({
      student: student._id,
      campus: req.campus._id,
      date: todayString,
      mealType: currentMealType,
    });

    if (existingStationScan) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate This Meal",
        student,
      });
    }

    const stationScan = await StationScan.create({
      student: student._id,
      campus: req.campus._id,
      date: todayString,
      mealType: currentMealType,
    });

    await Meal.updateOne(
      {
        campus: req.campus._id,
        mealType: currentMealType,
        date: today,
      },
      {
        $setOnInsert: {
          campus: req.campus._id,
          mealType: currentMealType,
          date: today,
          year: getCurrentYear(today),
          semester: getCurrentSemester(today),
        },
        $addToSet: {
          students: student._id,
        },
      },
      { upsert: true },
    );

    res.json({
      allowed: true,
      message: "Allowed to Eat",
      student,
      mealType: currentMealType,
      stationScanId: stationScan._id,
    });
  } catch (err) {
    console.error("Scan error:", err);
    if (err.code === 11000) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate This Meal",
      });
    }
    res.status(500).json({ message: "Scan failed" });
  }
};

export const getCampusDashboardStats = async (req, res) => {
  try {
    const campusId = req.campus._id;

    await finalizeExpiredStationScans(campusId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = getCurrentYear();
    const semester = getCurrentSemester();

    const totalStudents = await Student.countDocuments({ campus: campusId });

    const todaysMeals = await Meal.find({
      campus: campusId,
      date: today,
      year,
      semester,
    }).populate("students", "name");

    const servedStudents = new Set();
    const recentScans = [];

    todaysMeals.forEach((meal) => {
      const uniqueStudents = new Set();

      meal.students.forEach((student) => {
        servedStudents.add(student._id.toString());
        uniqueStudents.add(student._id.toString());
        recentScans.push({
          name: student.name,
          time: meal.createdAt,
          mealType: meal.mealType,
        });
      });

      meal._uniqueStudentCount = uniqueStudents.size;
    });

    recentScans.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentScansLimited = recentScans.slice(0, 5);

    res.json({
      totalStudents,
      servedStudents: servedStudents.size,
      pendingStudents: Math.max(totalStudents - servedStudents.size, 0),
      recentScans: recentScansLimited,
      todaysMeals: todaysMeals.map((meal) => ({
        mealType: meal.mealType,
        count: meal._uniqueStudentCount ?? meal.students.length,
      })),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
