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
  getMealSessionWindow,
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
    const sessionWindow = getMealSessionWindow(mealType, queryDate);
    const trackingStartAt = campus.createdAt ? new Date(campus.createdAt) : null;
    const isBeforeSystemStart =
      Boolean(snapshotCutoff && sessionWindow?.end && trackingStartAt) &&
      sessionWindow.end < trackingStartAt;
    const hasSnapshotData = Boolean(snapshotCutoff) && !isBeforeSystemStart;
    const noDataReason = !snapshotCutoff
      ? "upcoming"
      : isBeforeSystemStart
        ? "before_system_start"
        : null;

    let totalStudents = null;
    let regularStudents = null;
    let internshipStudents = null;
    let fastingBreakdown = null;
    let regularFastingBreakdown = null;
    let internshipFastingBreakdown = null;
    let servedFastingBreakdown = null;
    let notServedFastingBreakdown = null;

    const buildFastingBreakdown = (students = []) => ({
      fasting: students.filter((student) => student.fastingType === "fasting")
        .length,
      sundayFasting: students.filter(
        (student) => student.fastingType === "sunday_fasting",
      ).length,
      muslimFasting: students.filter(
        (student) => student.fastingType === "muslim_fasting",
      ).length,
      notFasting: students.filter(
        (student) => student.fastingType === "not_fasting",
      ).length,
    });

    const getStudentEffectiveCreatedAt = (student) => {
      if (student.createdAt) {
        return new Date(student.createdAt);
      }

      if (student._id && typeof student._id.getTimestamp === "function") {
        return student._id.getTimestamp();
      }

      return null;
    };

    let snapshotStudents = [];

    if (hasSnapshotData) {
      const campusStudents = await Student.find({ campus: campusId })
        .select("_id fastingType isInternship createdAt")
        .lean();

      snapshotStudents = campusStudents.filter((student) => {
        const effectiveCreatedAt = getStudentEffectiveCreatedAt(student);
        return effectiveCreatedAt && effectiveCreatedAt <= snapshotCutoff;
      });

      const regularSnapshotStudents = snapshotStudents.filter(
        (student) => !student.isInternship,
      );
      const internshipSnapshotStudents = snapshotStudents.filter(
        (student) => student.isInternship,
      );

      totalStudents = snapshotStudents.length;
      regularStudents = regularSnapshotStudents.length;
      internshipStudents = internshipSnapshotStudents.length;
      fastingBreakdown = buildFastingBreakdown(snapshotStudents);
      regularFastingBreakdown = buildFastingBreakdown(regularSnapshotStudents);
      internshipFastingBreakdown = buildFastingBreakdown(
        internshipSnapshotStudents,
      );
    }

    const meal = await Meal.findOne({
      campus: campusId,
      year: resolvedYear,
      semester: resolvedSemester,
      date: queryDate,
      mealType,
    });

    const servedStudentIds = hasSnapshotData
      ? meal
        ? await dedupeMealStudents(meal)
        : []
      : [];

    const servedStudents = hasSnapshotData ? servedStudentIds.length : null;

    const regularSnapshotStudents = snapshotStudents.filter(
      (student) => !student.isInternship,
    );

    const servedStudentIdSet = new Set(
      servedStudentIds.map((studentId) => studentId.toString()),
    );

    const servedSnapshotStudents = regularSnapshotStudents.filter((student) =>
      servedStudentIdSet.has(student._id.toString()),
    );

    const notServedSnapshotStudents = regularSnapshotStudents.filter(
      (student) => !servedStudentIdSet.has(student._id.toString()),
    );

    const notServedStudents = hasSnapshotData
      ? notServedSnapshotStudents.length
      : null;

    if (hasSnapshotData) {
      servedFastingBreakdown = buildFastingBreakdown(servedSnapshotStudents);
    }

    if (hasSnapshotData) {
      notServedFastingBreakdown =
        buildFastingBreakdown(notServedSnapshotStudents);
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
        regularFastingBreakdown,
        internshipFastingBreakdown,
        servedFastingBreakdown,
        notServedFastingBreakdown,
        servedStudents,
        notServedStudents,
        sessionStatus,
        hasSnapshotData,
        noDataReason,
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
