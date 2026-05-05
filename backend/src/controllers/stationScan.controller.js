import StationScan from "../models/stationScan.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import Meal from "../models/meal.model.js";
import {
  finalizeExpiredStationScans,
  getCurrentMealType,
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
import { getStudentCampusQuery } from "../utils/campusId.js";
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

const createStudentSnapshot = (student = {}, campus = {}, scannedAt = new Date()) => ({
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

const buildMealSummarySnapshot = (campusStudents = [], servedStudentIds = []) => {
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
  if (!dayString || typeof timeValue !== "string") {
    return null;
  }

  const [hour, minute] = timeValue.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const date = new Date(`${dayString}T00:00:00`);
  date.setHours(hour, minute, 0, 0);
  return date;
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

    const currentMealType = await getCurrentMealType(req.campus.id);
    const today = new Date(scanTime);
    today.setHours(0, 0, 0, 0);
    const todayString = getDayString(today);

    if (!currentMealType) {
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

    const mealSchedule = await getMealSchedule(req.campus.id);
    const appliedWindow = mealSchedule[currentMealType];
    const actualOpenedAt = getBoundedOpenedAt(
      req.campus.lastActiveAt || scanTime,
      appliedWindow,
      todayString,
    );
    const campusSnapshot = createCampusSnapshot(req.campus);
    const studentSnapshot = createStudentSnapshot(normalizedStudent, req.campus, scanTime);

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
          (snapshot) => String(snapshot.studentId) !== String(student.studentId),
        ),
        studentSnapshot,
      ];
      const existingAppliedWindow = existingMeal.appliedWindow || {};
      const summarySnapshot = buildMealSummarySnapshot(campusStudents, students);
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
          actualOpenedAt: existingAppliedWindow.actualOpenedAt || actualOpenedAt,
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
    const studentCampusQuery = getStudentCampusQuery(req.campus);

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
    const summarySnapshot = meal?.summarySnapshot || null;
    const recentScans = await StationScan.findAll({
      campus: campusId,
      date: getDayString(mealDate),
      mealType,
      orderByCreatedAtDesc: true,
      limit: 5,
    });
    let fallbackSummary = null;

    if (!summarySnapshot) {
      const campusStudents = await CafeStudent.findAll(studentCampusQuery);
      fallbackSummary = buildMealSummarySnapshot(
        campusStudents,
        meal?.students || [],
      );
    }
    const activeSummary = summarySnapshot || fallbackSummary;

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
      fastingBreakdown: activeSummary?.fastingBreakdown || buildFastingBreakdown([]),
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
