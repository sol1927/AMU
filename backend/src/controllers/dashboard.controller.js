import Campus from "../models/campus.model.js";
import Student from "../models/student.model.js";
import Meal from "../models/meal.model.js";
import {
  dedupeMealStudents,
  finalizeExpiredStationScans,
  getCurrentSemester,
  getCurrentYear,
  getMealSnapshotCutoff,
  getMealSessionStatus,
} from "../utils/mealSession.js";

export const getAdminDashboard = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = getCurrentYear();
    const semester = getCurrentSemester();

    const campuses = await Campus.find({ createdBy: req.userId }).lean();

    await Promise.all(
      campuses.map((campus) => finalizeExpiredStationScans(campus._id)),
    );

    let totalStudents = 0;
    let totalServed = 0;

    const campusesWithStats = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await Student.countDocuments({
          campus: campus._id,
        });

        const todaysMeals = await Meal.find({
          campus: campus._id,
          date: today,
          year,
          semester,
        });

        const servedCount = new Set();
        todaysMeals.forEach((meal) => {
          meal.students.forEach((studentId) =>
            servedCount.add(studentId.toString()),
          );
        });

        totalStudents += studentsCount;
        totalServed += servedCount.size;

        return {
          ...campus,
          students: studentsCount,
          served: servedCount.size,
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

export const getMeals = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId, year, semester, date, mealType } = req.query;

    if (!campusId || !date || !mealType) {
      return res.status(400).json({
        message: "campusId, date, and mealType are required",
      });
    }

    const campus = await Campus.findOne({
      _id: campusId,
      createdBy: req.userId,
    });
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    await finalizeExpiredStationScans(campusId);

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const resolvedYear =
      year && !Number.isNaN(Number(year))
        ? Number(year)
        : getCurrentYear(queryDate);
    const resolvedSemester =
      semester || getCurrentSemester(queryDate);
    const sessionStatus = getMealSessionStatus(mealType, queryDate);
    const snapshotCutoff = getMealSnapshotCutoff(mealType, queryDate);

    let totalStudents = null;
    let regularStudents = null;
    let internshipStudents = null;
    let fastingBreakdown = null;
    let servedFastingBreakdown = null;

    if (snapshotCutoff) {
      const studentSnapshotQuery = {
        campus: campusId,
        createdAt: { $lte: snapshotCutoff },
      };

      const [
        totalCount,
        regularCount,
        internshipCount,
        fastingCount,
        sundayFastingCount,
        muslimFastingCount,
        notFastingCount,
      ] = await Promise.all([
        Student.countDocuments(studentSnapshotQuery),
        Student.countDocuments({
          ...studentSnapshotQuery,
          isInternship: false,
        }),
        Student.countDocuments({
          ...studentSnapshotQuery,
          isInternship: true,
        }),
        Student.countDocuments({
          ...studentSnapshotQuery,
          fastingType: "fasting",
        }),
        Student.countDocuments({
          ...studentSnapshotQuery,
          fastingType: "sunday_fasting",
        }),
        Student.countDocuments({
          ...studentSnapshotQuery,
          fastingType: "muslim_fasting",
        }),
        Student.countDocuments({
          ...studentSnapshotQuery,
          fastingType: "not_fasting",
        }),
      ]);

      totalStudents = totalCount;
      regularStudents = regularCount;
      internshipStudents = internshipCount;
      fastingBreakdown = {
        fasting: fastingCount,
        sundayFasting: sundayFastingCount,
        muslimFasting: muslimFastingCount,
        notFasting: notFastingCount,
      };
    }

    const meal = await Meal.findOne({
      campus: campusId,
      year: resolvedYear,
      semester: resolvedSemester,
      date: queryDate,
      mealType,
    });

    const servedStudents = snapshotCutoff
      ? meal
        ? (await dedupeMealStudents(meal)).length
        : 0
      : null;

    if (snapshotCutoff && meal && servedStudents) {
      const servedStudentIds = await dedupeMealStudents(meal);

      const [
        servedFasting,
        servedSundayFasting,
        servedMuslimFasting,
        servedNotFasting,
      ] = await Promise.all([
        Student.countDocuments({
          _id: { $in: servedStudentIds },
          fastingType: "fasting",
        }),
        Student.countDocuments({
          _id: { $in: servedStudentIds },
          fastingType: "sunday_fasting",
        }),
        Student.countDocuments({
          _id: { $in: servedStudentIds },
          fastingType: "muslim_fasting",
        }),
        Student.countDocuments({
          _id: { $in: servedStudentIds },
          fastingType: "not_fasting",
        }),
      ]);

      servedFastingBreakdown = {
        fasting: servedFasting,
        sundayFasting: servedSundayFasting,
        muslimFasting: servedMuslimFasting,
        notFasting: servedNotFasting,
      };
    } else if (snapshotCutoff) {
      servedFastingBreakdown = {
        fasting: 0,
        sundayFasting: 0,
        muslimFasting: 0,
        notFasting: 0,
      };
    }

    res.json({
      summary: {
        campusId: campus._id,
        campusName: campus.name,
        date: queryDate,
        mealType,
        year: resolvedYear,
        semester: resolvedSemester,
        isFutureDate: sessionStatus === "upcoming",
        totalStudents,
        regularStudents,
        internshipStudents,
        fastingBreakdown,
        servedFastingBreakdown,
        servedStudents,
        notServedStudents:
          !snapshotCutoff || totalStudents === null || servedStudents === null
            ? null
            : Math.max(totalStudents - servedStudents, 0),
        sessionStatus,
      },
    });
  } catch (err) {
    console.error("Get meals error:", err);
    res.status(500).json({ message: "Failed to fetch meals" });
  }
};

export const getMealFilters = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId } = req.query;

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await Campus.findOne({
      _id: campusId,
      createdBy: req.userId,
    });
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const distinctMeals = await Meal.find({ campus: campusId })
      .distinct("year semester")
      .sort({ year: -1, semester: -1 });

    const filters = distinctMeals.map((item) => ({
      year: item.year,
      semester: item.semester,
    }));

    res.json({ filters });
  } catch (err) {
    console.error("Get meal filters error:", err);
    res.status(500).json({ message: "Failed to fetch meal filters" });
  }
};
