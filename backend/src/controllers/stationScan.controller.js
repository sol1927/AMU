import StationScan from "../models/stationScan.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import Meal from "../models/meal.model.js";
import {
  finalizeExpiredStationScans,
  getDashboardMealContext,
  getCurrentSemester,
  getCurrentYear,
  getDayString,
  getMealSchedule,
  getMealWindowLabel,
} from "../utils/mealSession.js";
import {
  getStudentFastingType,
  getStudentIsInternship,
  normalizeStudent,
} from "../utils/studentDefaults.js";
import {
  getStudentCampusQuery,
  getStudentCampusSyncQuery,
} from "../utils/campusId.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

const buildFastingBreakdown = (students = []) => ({
  fasting: students.filter(
    (student) => getStudentFastingType(student) === "fasting",
  ).length,
  sundayFasting: students.filter(
    (student) => getStudentFastingType(student) === "sunday_fasting",
  ).length,
  muslimFasting: students.filter(
    (student) => getStudentFastingType(student) === "muslim_fasting",
  ).length,
  notFasting: students.filter(
    (student) => getStudentFastingType(student) === "not_fasting",
  ).length,
});

const createCampusSnapshot = (campus = {}) => ({
  campusRef: campus.id ?? null,
  campusId: campus.campusId ?? null,
  campusName: campus.name || "Campus",
  location: campus.location || "",
});

const createStudentSnapshot = (
  student = {},
  campus = {},
  scannedAt = new Date(),
) => ({
  studentId: student.studentId || "",
  studentName: student.name || "Student",
  name: student.name || "Student",
  department: student.department || "",
  batch: student.batch ?? null,
  fastingType: getStudentFastingType(student),
  isInternship: getStudentIsInternship(student),
  campusId: campus.campusId ?? null,
  campusName: campus.name || "Campus",
  scannedAt: scannedAt.toISOString(),
});

const buildMealSummarySnapshot = (
  campusStudents = [],
  servedStudentIds = [],
) => {
  const regularStudentsList = campusStudents.filter(
    (student) => !getStudentIsInternship(student),
  );
  const internshipStudentsList = campusStudents.filter((student) =>
    getStudentIsInternship(student),
  );
  const servedStudentIdSet = new Set(servedStudentIds.map(String));
  const servedRegularStudentsList = regularStudentsList.filter((student) =>
    servedStudentIdSet.has(String(student.studentId)),
  );
  const pendingRegularStudentsList = regularStudentsList.filter(
    (student) => !servedStudentIdSet.has(String(student.studentId)),
  );

  return {
    totalStudents: campusStudents.length,
    regularStudents: regularStudentsList.length,
    internshipStudents: internshipStudentsList.length,
    servedStudents: servedRegularStudentsList.length,
    pendingStudents: pendingRegularStudentsList.length,
    fastingBreakdown: buildFastingBreakdown(campusStudents),
    regularFastingBreakdown: buildFastingBreakdown(regularStudentsList),
    internshipFastingBreakdown: buildFastingBreakdown(internshipStudentsList),
    servedFastingBreakdown: buildFastingBreakdown(servedRegularStudentsList),
    pendingFastingBreakdown: buildFastingBreakdown(pendingRegularStudentsList),
    capturedAt: new Date().toISOString(),
  };
};

const getAppliedWindowDate = (dayString, timeValue) => {
  if (!dayString || typeof timeValue !== "string") return null;

  // Explicitly parse the time in the campus timezone (UTC+3 for Ethiopia)
  const date = new Date(`${dayString}T${timeValue}:00+03:00`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getBoundedOpenedAt = (candidate, appliedWindow, dayString) => {
  const openedAt = candidate ? new Date(candidate) : null;
  const start = getAppliedWindowDate(dayString, appliedWindow?.start);
  const end = getAppliedWindowDate(dayString, appliedWindow?.end);

  if (!openedAt || Number.isNaN(openedAt.getTime())) {
    return (start || new Date()).toISOString();
  }

  if (start && openedAt < start) {
    return start.toISOString();
  }

  if (end && openedAt > end) {
    return end.toISOString();
  }

  return openedAt.toISOString();
};

export const scanStudentStation = async (req, res) => {
  try {
    const { studentId } = req.body;
    const scanTime = new Date();

    await finalizeExpiredStationScans(req.campus.id);
    const studentCampusQuery = getStudentCampusQuery(req.campus);

    // Get the date string relative to the campus timezone
    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
    }).format(scanTime);

    // Create a Date object representing the start of today in the campus timezone
    // This is crucial for getCurrentYear and getCurrentSemester
    const today = new Date(`${todayString}T00:00:00+03:00`);

    // get schedule
    const mealSchedule = await getMealSchedule(req.campus.id);

    // 🔥 determine active meal by time (NO getCurrentMealType)
    const now = scanTime.getTime();

    let currentMealType = null;
    let appliedWindow = null;

    for (const [mealType, window] of Object.entries(mealSchedule)) {
      const start = getAppliedWindowDate(todayString, window?.start)?.getTime();
      const end = getAppliedWindowDate(todayString, window?.end)?.getTime();

      if (start && end && now >= start && now <= end) {
        currentMealType = mealType;
        appliedWindow = window;
        break;
      }
    }

    // 🚨 HARD BLOCK if outside meal time
    if (!currentMealType || !appliedWindow) {
      return res.status(400).json({
        allowed: false,
        message: "Time is up",
      });
    }

    const student = await CafeStudent.findOne({
      studentId,
      ...studentCampusQuery,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const normalizedStudent = normalizeStudent(student);

    if (getStudentIsInternship(normalizedStudent)) {
      return res.json({
        allowed: false,
        message: "Internship students are not allowed to scan",
        student: normalizedStudent,
      });
    }

    const existingStationScan = await StationScan.findOne({
      studentId: student.studentId,
      campus: req.campus.id,
      date: todayString,
      mealType: currentMealType,
    });

    if (existingStationScan) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate This Meal",
        student: normalizedStudent,
      });
    }

    const actualOpenedAt = getBoundedOpenedAt(
      req.campus.lastActiveAt || scanTime,
      appliedWindow,
      todayString,
    );
    const campusSnapshot = createCampusSnapshot(req.campus);
    const studentSnapshot = createStudentSnapshot(
      normalizedStudent,
      req.campus,
      scanTime,
    );

    const stationScan = await StationScan.create({
      student: student.id,
      studentId: student.studentId,
      studentName: normalizedStudent.name,
      department: normalizedStudent.department || "",
      batch: normalizedStudent.batch ?? null,
      fastingType: normalizedStudent.fastingType,
      isInternship: normalizedStudent.isInternship,
      campus: req.campus.id,
      campusId: req.campus.campusId ?? null,
      campusName: req.campus.name || "Campus",
      date: todayString,
      mealType: currentMealType,
      scannedAt: scanTime,
    });

    const existingMeal = await Meal.findOne({
      campus: req.campus.id,
      mealType: currentMealType,
      date: todayString,
    });

    const campusStudents = await CafeStudent.findAll(studentCampusQuery);

    if (existingMeal) {
      const students = Array.from(
        new Set([
          ...(existingMeal.students || []).map(String),
          String(student.studentId),
        ]),
      );
      const studentSnapshots = [
        ...(existingMeal.studentSnapshots || []).filter(
          (snapshot) =>
            String(snapshot.studentId) !== String(student.studentId),
        ),
        studentSnapshot,
      ];
      const existingAppliedWindow = existingMeal.appliedWindow || {};
      const summarySnapshot = buildMealSummarySnapshot(
        campusStudents,
        students,
      );
      await Meal.updateById(existingMeal.id, {
        campusSnapshot: existingMeal.campusSnapshot || campusSnapshot,
        students,
        studentSnapshots,
        summarySnapshot,
        appliedWindow: {
          ...existingAppliedWindow,
          start: existingAppliedWindow.start || appliedWindow.start,
          end: existingAppliedWindow.end || appliedWindow.end,
          label:
            existingAppliedWindow.label || getMealWindowLabel(appliedWindow),
          actualOpenedAt:
            existingAppliedWindow.actualOpenedAt || actualOpenedAt,
          // Reopen the session if the campus logged out and then resumed scanning
          // before the applied session window finished.
          actualClosedAt: null,
        },
      });
    } else {
      await Meal.create({
        campus: req.campus.id,
        mealType: currentMealType,
        date: todayString,
        year: getCurrentYear(today),
        semester: getCurrentSemester(today),
        campusSnapshot,
        appliedWindow: {
          start: appliedWindow.start,
          end: appliedWindow.end,
          label: getMealWindowLabel(appliedWindow),
          actualOpenedAt,
          actualClosedAt: null,
        },
        studentSnapshots: [studentSnapshot],
        summarySnapshot: buildMealSummarySnapshot(campusStudents, [
          String(student.studentId),
        ]),
        students: [String(student.studentId)],
      });
    }

    res.json({
      allowed: true,
      message: "Allowed to Eat",
      student: normalizedStudent,
      mealType: currentMealType,
      stationScanId: stationScan.id,
    });
  } catch (err) {
    logInternalError("station-scan", err);
    sendServerError(res, "We could not complete the scan. Please try again.");
  }
};

export const getCampusDashboardStats = async (req, res) => {
  try {
    const campusId = req.campus.id;
    const studentSyncQuery = getStudentCampusSyncQuery(req.campus);

    const now = new Date();
    const { mealType, label, targetDate } = await getDashboardMealContext(
      campusId,
      now,
    );
    const mealDate = new Date(targetDate);
    mealDate.setHours(0, 0, 0, 0);
    const year = getCurrentYear(mealDate);
    const semester = getCurrentSemester(mealDate);
    const mealSchedule = await getMealSchedule(campusId);

    const meal = await Meal.findOne({
      campus: campusId,
      date: getDayString(mealDate),
      year,
      semester,
      mealType,
    });

    const recentScans = await StationScan.findAll({
      campus: campusId,
      date: getDayString(mealDate),
      mealType,
      orderByCreatedAtDesc: true,
      limit: 5,
    });

    // Always calculate the summary live from the student database to ensure
    // accuracy (e.g., if students were synced or moved to internship recently).
    // Stored snapshots in the 'meal' record can become stale.
    // We use the Sync Query to match the counting logic used in the Admin Dashboard.
    const campusStudents = await CafeStudent.findAll(studentSyncQuery);
    const servedScans = await StationScan.findAll({
      campus: campusId,
      date: getDayString(mealDate),
      mealType,
    });

    const servedStudentIds = servedScans.map((s) => s.studentId);

    const activeSummary = buildMealSummarySnapshot(
      campusStudents,
      servedStudentIds,
    );

    // Optionally update the meal record with the fresh snapshot for admin history
    if (meal && !meal.summarySnapshot) {
      await Meal.updateById(meal.id, { summarySnapshot: activeSummary }).catch(
        () => null,
      );
    }

    res.json({
      mealType,
      mealLabel: label,
      mealSchedule,
      mealDate,
      totalStudents: activeSummary?.totalStudents ?? 0,
      regularStudents: activeSummary?.regularStudents ?? 0,
      internshipStudents: activeSummary?.internshipStudents ?? 0,
      servedStudents: activeSummary?.servedStudents ?? 0,
      pendingStudents: activeSummary?.pendingStudents ?? 0,
      fastingBreakdown:
        activeSummary?.fastingBreakdown || buildFastingBreakdown([]),
      regularFastingBreakdown:
        activeSummary?.regularFastingBreakdown || buildFastingBreakdown([]),
      internshipFastingBreakdown:
        activeSummary?.internshipFastingBreakdown || buildFastingBreakdown([]),
      servedFastingBreakdown:
        activeSummary?.servedFastingBreakdown || buildFastingBreakdown([]),
      pendingFastingBreakdown:
        activeSummary?.pendingFastingBreakdown || buildFastingBreakdown([]),
      recentScans: recentScans.map((scan) => ({
        name: scan.studentName || "Student",
        time: scan.scannedAt || scan.createdAt,
        mealType,
      })),
    });
  } catch (err) {
    logInternalError("campus-dashboard-stats", err);
    sendServerError(
      res,
      "We could not load the dashboard right now. Please try again.",
    );
  }
};
