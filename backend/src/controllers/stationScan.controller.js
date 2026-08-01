import StationScan from "../models/stationScan.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import Meal from "../models/meal.model.js";
import User from "../models/user.model.js";
import mealSessionConfigHistory from "../models/mealSessionConfigHistory.model.js";
import mealAttendanceSnapshot from "../models/mealAttendanceSnapshot.model.js";
import MealSessionSnapshot from "../models/mealSessionSnapshot.model.js";
import MealScanHistory from "../models/mealScanHistory.model.js";
import { getAppMinutesFromDate } from "../utils/appTimezone.js";
import {
  finalizeExpiredStationScans,
  getDashboardMealContext,
  getCurrentSemester,
  getCurrentYear,
  getDayString,
  getMealScheduleAt,
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
import { APP_TIMEZONE } from "../utils/appTimezone.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";
import {
  filterStudentsForCafeNumber,
  getCafeDisplayName,
  getEffectiveStudentCafeNumber,
} from "../utils/cafeScope.js";

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
  cafeNumber: campus.selectedCafeNumber ?? null,
  cafeDisplayName: getCafeDisplayName(campus.name, campus.selectedCafeNumber),
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
  cafeNumber: campus.selectedCafeNumber ?? null,
  cafeDisplayName: getCafeDisplayName(campus.name, campus.selectedCafeNumber),
  scannedAt: scannedAt.toISOString(),
});

const getAppDayOfWeek = (date = new Date()) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(date);

  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
};

const isOrthodoxFastingBreakfastDenied = (
  student = {},
  mealType,
  date = new Date(),
) => {
  if (mealType !== "breakfast") return false;
  if (getStudentFastingType(student) !== "fasting") return false;

  const dayOfWeek = getAppDayOfWeek(date);
  return dayOfWeek >= 1 && dayOfWeek <= 5;
};

const isMuslimFastingMealDenied = (student = {}, mealType) => {
  if (getStudentFastingType(student) !== "muslim_fasting") return false;
  return mealType !== "dinner";
};

const isSundayFastingBreakfastDenied = (
  student = {},
  mealType,
  date = new Date(),
) => {
  if (mealType !== "breakfast") return false;
  if (getStudentFastingType(student) !== "sunday_fasting") return false;

  const dayOfWeek = getAppDayOfWeek(date);
  return dayOfWeek === 0; // Sunday
};

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

const getReadableCafeName = (name, displayName, cafeNumber) => {
  if (displayName) return displayName;
  const safeName = String(name || "").trim();
  if (!safeName) return `Cafe ${cafeNumber}`;

  const cafeNumberMatch = safeName.match(/^cafe\s*(\d+)$/i);
  if (cafeNumberMatch) return `Cafe ${cafeNumberMatch[1]}`;

  if (/^cafe/i.test(safeName)) {
    const stripped = safeName.replace(/^cafe/i, "").trim();
    if (/^\d+$/.test(stripped)) {
      return `Cafe ${stripped}`;
    }
  }

  return safeName
    .split(/([\s-]+)/)
    .map((segment) =>
      segment.match(/^[\s-]+$/)
        ? segment
        : segment[0]?.toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join("");
};

const getCafeLabelForNumber = (cafes = [], cafeNumber) => {
  const normalizedCafeNumber = Number(cafeNumber);
  if (!Number.isInteger(normalizedCafeNumber) || normalizedCafeNumber < 1) {
    return null;
  }

  const matchedCafe = cafes.find((cafe, index) => {
    const cafeNumberCandidate = Number(
      cafe.cafeNumber ?? String(cafe.name || "").match(/\d+/)?.[0],
    );

    if (Number.isInteger(cafeNumberCandidate) && cafeNumberCandidate > 0) {
      return cafeNumberCandidate === normalizedCafeNumber;
    }

    return index + 1 === normalizedCafeNumber;
  });

  if (matchedCafe) {
    return getReadableCafeName(
      matchedCafe.name,
      matchedCafe.displayName,
      normalizedCafeNumber,
    );
  }

  const fallbackCafe = cafes[normalizedCafeNumber - 1];
  return fallbackCafe
    ? getReadableCafeName(
      fallbackCafe.name,
      fallbackCafe.displayName,
      normalizedCafeNumber,
    )
    : `Cafe ${normalizedCafeNumber}`;
};

const parseTimeToMinutes = (value) => {
  if (typeof value !== "string") return null;
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour * 60 + minute;
};

const getAppliedWindowDate = (dayString, timeValue) => {
  if (!dayString || typeof timeValue !== "string") return null;

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

    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
    }).format(scanTime);

    const today = new Date(`${todayString}T00:00:00+03:00`);

    const mealSchedule = await getMealScheduleAt(req.campus.id, scanTime);

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

    // Check if snapshot is locked/ended for today's session
    const existingSnapshotForCheck = await MealSessionSnapshot.findOne({
      campusId: req.campus.id,
      cafeteriaId: req.cafeNumber,
      date: todayString,
      mealSession: currentMealType,
    });

    const currentMinutes = getAppMinutesFromDate(scanTime);
    const activeEndMinutes = parseTimeToMinutes(appliedWindow.end);

    if (existingSnapshotForCheck) {
      const activeStartMinutes = parseTimeToMinutes(appliedWindow.start);

      if (
        existingSnapshotForCheck.sessionStatus === "Closed" &&
        activeStartMinutes !== null &&
        currentMinutes >= activeStartMinutes &&
        activeEndMinutes !== null &&
        currentMinutes < activeEndMinutes
      ) {
        await MealSessionSnapshot.updateById(existingSnapshotForCheck.id, {
          sessionStatus: "Active",
          sessionStartTime: appliedWindow.start,
          sessionEndTime: appliedWindow.end,
        });
      }

      if (
        existingSnapshotForCheck.sessionStatus === "Closed" &&
        (activeEndMinutes === null || currentMinutes >= activeEndMinutes)
      ) {
        return res.status(400).json({
          allowed: false,
          message: "Time is up",
        });
      }

      if (
        existingSnapshotForCheck.sessionStatus === "Active" &&
        existingSnapshotForCheck.sessionEndTime !== appliedWindow.end
      ) {
        await MealSessionSnapshot.updateById(existingSnapshotForCheck.id, {
          sessionEndTime: appliedWindow.end,
        });
      }

      if (activeEndMinutes !== null && currentMinutes >= activeEndMinutes) {
        if (existingSnapshotForCheck.sessionStatus === "Active") {
          await MealSessionSnapshot.updateById(existingSnapshotForCheck.id, {
            sessionStatus: "Closed",
          });
        }
        return res.status(400).json({
          allowed: false,
          message: "Time is up",
        });
      }
    }

    let activeConfig = await mealSessionConfigHistory.findActiveConfig(
      req.campus.id,
      currentMealType,
      todayString,
    );
    if (!activeConfig) {
      activeConfig = await mealSessionConfigHistory.create({
        sessionName: currentMealType,
        startTime: appliedWindow.start,
        endTime: appliedWindow.end,
        appliedDate: todayString,
        appliedTimestamp: new Date(),
        campusId: req.campus.id,
        createdBy: req.campus.id,
        version: 1,
      });
    }
    const appliedSessionConfigId = activeConfig.id;

    const student = await CafeStudent.findOne({
      studentId,
      ...studentCampusQuery,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const campusForScope = (await User.findById(req.campus.id)) || req.campus;

    const assignedCafeNumber = getEffectiveStudentCafeNumber(
      student,
      campusForScope,
    );

    if (!assignedCafeNumber || assignedCafeNumber <= 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const campusCafes = (
      await User.findAll({
        campusId: campusForScope.campusId || campusForScope.id,
        role: "cafe",
      })
    ).sort((a, b) => a.id - b.id);
    const assignedCafeName = getCafeLabelForNumber(
      campusCafes,
      assignedCafeNumber,
    );

    const accessibleStudents = filterStudentsForCafeNumber(
      [student],
      campusForScope,
      req.cafeNumber,
    );

    if (accessibleStudents.length === 0) {
      const cafeMismatchMessage = `የተመደቡበት ካፌ ${assignedCafeName}`;

      return res.json({
        allowed: false,
        message: cafeMismatchMessage,
        student: {
          ...normalizeStudent(student),
          assignedCafeNumber,
          assignedCafeName,
          statusMessage: cafeMismatchMessage,
        },
      });
    }

    const normalizedStudent = normalizeStudent(student);

    if (getStudentIsInternship(normalizedStudent)) {
      const internshipMessage = "አልተፈቀደም";
      return res.json({
        allowed: false,
        message: internshipMessage,
        student: {
          ...normalizedStudent,
          statusMessage: internshipMessage,
        },
      });
    }

    if (
      isOrthodoxFastingBreakfastDenied(
        normalizedStudent,
        currentMealType,
        today,
      )
    ) {
      const fastingMessage = "አልተፈቀደም";
      return res.json({
        allowed: false,
        message: fastingMessage,
        student: {
          ...normalizedStudent,
          statusMessage: fastingMessage,
        },
      });
    }

    if (isMuslimFastingMealDenied(normalizedStudent, currentMealType)) {
      const muslimFastingMessage = "አልተፈቀደም";
      return res.json({
        allowed: false,
        message: muslimFastingMessage,
        student: {
          ...normalizedStudent,
          statusMessage: muslimFastingMessage,
        },
      });
    }

    if (
      isSundayFastingBreakfastDenied(normalizedStudent, currentMealType, today)
    ) {
      const sundayFastingMessage = "አልተፈቀደም";
      return res.json({
        allowed: false,
        message: sundayFastingMessage,
        student: {
          ...normalizedStudent,
          statusMessage: sundayFastingMessage,
        },
      });
    }

    const existingStationScan = await StationScan.findOne({
      studentId: student.studentId,
      campus: req.campus.id,
      date: todayString,
      mealType: currentMealType,
    });

    if (existingStationScan) {
      const duplicateMessage = "\u12a0\u120d\u1270\u1348\u1240\u12f0\u121d";
      return res.json({
        allowed: false,
        denialCode: "duplicate",
        message: duplicateMessage,
        student: {
          ...normalizedStudent,
          denialCode: "duplicate",
          statusMessage: duplicateMessage,
        },
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
      cafeNumber: req.cafeNumber,
      date: todayString,
      mealType: currentMealType,
      scannedAt: scanTime,
    });

    const existingMeal = await Meal.findOne({
      campus: req.campus.id,
      cafeNumber: req.cafeNumber,
      mealType: currentMealType,
      date: todayString,
    });

    const campusStudents = filterStudentsForCafeNumber(
      await CafeStudent.findAll(studentCampusQuery),
      req.campus,
      req.cafeNumber,
    );

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

          actualClosedAt: null,
        },
      });
    } else {
      await Meal.create({
        campus: req.campus.id,
        cafeNumber: req.cafeNumber,
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

    // Save attendance snapshot!
    await mealAttendanceSnapshot
      .create({
        studentId: student.studentId,
        studentDetails: normalizedStudent,
        fastingType: normalizedStudent.fastingType,
        campusId: req.campus.id,
        cafeteria: req.cafeNumber,
        mealSession: currentMealType,
        sessionStartTime: appliedWindow.start,
        sessionEndTime: appliedWindow.end,
        attendanceDate: todayString,
        scanTimestamp: scanTime,
        appliedSessionConfigId,
      })
      .catch((err) => {
        console.error("Failed to save attendance snapshot:", err.message);
      });

    // Historical Meal Session Snapshot System
    try {
      const existingSnapshot = await MealSessionSnapshot.findOne({
        campusId: req.campus.id,
        cafeteriaId: req.cafeNumber,
        date: todayString,
        mealSession: currentMealType,
      });

      if (!existingSnapshot) {
        // First student successfully scanned. Create snapshot!
        const allCampusStudents = await CafeStudent.findAll({
          ...studentCampusQuery,
          isInternship: 0,
        });
        const cafeteriaStudents = filterStudentsForCafeNumber(
          allCampusStudents,
          campusForScope,
          req.cafeNumber,
        );

        const totalStudents = cafeteriaStudents.length;
        const assignedStudents = cafeteriaStudents.length;
        const unassignedStudents = allCampusStudents.filter(
          (s) => getEffectiveStudentCafeNumber(s, campusForScope) === null,
        ).length;

        const orthodoxFastingCount = cafeteriaStudents.filter(
          (s) => getStudentFastingType(s) === "fasting",
        ).length;
        const muslimFastingCount = cafeteriaStudents.filter(
          (s) => getStudentFastingType(s) === "muslim_fasting",
        ).length;
        const sundayFastingCount = cafeteriaStudents.filter(
          (s) => getStudentFastingType(s) === "sunday_fasting",
        ).length;
        const notFastingCount = cafeteriaStudents.filter(
          (s) => getStudentFastingType(s) === "not_fasting",
        ).length;

        const servedCount = 1;
        const unservedCount = Math.max(0, assignedStudents - 1);

        const cafeteriaName =
          getCafeLabelForNumber(campusCafes, req.cafeNumber) ||
          `Cafe ${req.cafeNumber}`;

        await MealSessionSnapshot.create({
          campusId: req.campus.id,
          cafeteriaId: req.cafeNumber,
          cafeteriaName,
          date: todayString,
          mealSession: currentMealType,
          sessionStartTime: appliedWindow.start,
          sessionEndTime: appliedWindow.end,
          snapshotCreatedAt: scanTime,
          sessionStatus: "Active",
          totalStudents,
          assignedStudents,
          unassignedStudents,
          orthodoxFastingCount,
          muslimFastingCount,
          sundayFastingCount,
          notFastingCount,
          servedCount,
          unservedCount,
        });
      } else {
        // Snapshot already exists. Increment servedCount and decrement unservedCount
        const newServedCount = existingSnapshot.servedCount + 1;
        const newUnservedCount = Math.max(
          0,
          existingSnapshot.assignedStudents - newServedCount,
        );
        await MealSessionSnapshot.updateById(existingSnapshot.id, {
          servedCount: newServedCount,
          unservedCount: newUnservedCount,
        });
      }

      // Store in MealScanHistory
      await MealScanHistory.create({
        studentId: student.studentId,
        studentName: normalizedStudent.name,
        mealSession: currentMealType,
        date: todayString,
        exactScanTimestamp: scanTime,
        cafeteria: req.cafeNumber,
        campus: req.campus.id,
        fastingTypeAtScanTime: normalizedStudent.fastingType,
      });
    } catch (snapshotErr) {
      console.error(
        "Failed to handle historical snapshot / scan history:",
        snapshotErr.message,
      );
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
    const totalCampusStudents =
      await CafeStudent.countDocuments(studentSyncQuery);

    const now = new Date();
    const { mealType, label, targetDate } = await getDashboardMealContext(
      campusId,
      now,
    );
    const mealDayString = getDayString(targetDate);
    const year = getCurrentYear(targetDate);
    const semester = getCurrentSemester(targetDate);
    const mealSchedule = await getMealScheduleAt(campusId, targetDate);

    const isAllCafes = req.query.all === "true";
    let activeCafeNumber = req.cafeNumber;
    if (req.query.cafeNumber) {
      const parsedQueryNum = Number(req.query.cafeNumber);
      if (Number.isInteger(parsedQueryNum) && parsedQueryNum > 0) {
        activeCafeNumber = parsedQueryNum;
      }
    }

    let activeSummary;
    let recentScans = [];

    if (isAllCafes) {
      const allStudents = await CafeStudent.findAll(studentSyncQuery);
      const cafeNumbers = req.campus.cafeNumbers || [];

      let totalRegular = 0;
      let totalInternship = 0;
      let totalServed = 0;
      let totalPending = 0;

      const combinedFastingBreakdown = {
        fasting: 0,
        sundayFasting: 0,
        muslimFasting: 0,
        notFasting: 0,
      };
      const combinedRegularFasting = {
        fasting: 0,
        sundayFasting: 0,
        muslimFasting: 0,
        notFasting: 0,
      };
      const combinedInternshipFasting = {
        fasting: 0,
        sundayFasting: 0,
        muslimFasting: 0,
        notFasting: 0,
      };
      const combinedServedFasting = {
        fasting: 0,
        sundayFasting: 0,
        muslimFasting: 0,
        notFasting: 0,
      };
      const combinedPendingFasting = {
        fasting: 0,
        sundayFasting: 0,
        muslimFasting: 0,
        notFasting: 0,
      };

      recentScans = await StationScan.findAll({
        campus: campusId,
        date: mealDayString,
        mealType,
        orderByCreatedAtDesc: true,
        limit: 5,
      });

      for (const cafeNum of cafeNumbers) {
        const cafeStudents = filterStudentsForCafeNumber(
          allStudents,
          req.campus,
          cafeNum,
        );
        const servedScans = await StationScan.findAll({
          campus: campusId,
          cafeNumber: cafeNum,
          date: mealDayString,
          mealType,
        });

        const servedStudentIds = servedScans.map((s) => s.studentId);
        const summary = buildMealSummarySnapshot(
          cafeStudents,
          servedStudentIds,
        );

        if (summary) {
          totalRegular += summary.regularStudents || 0;
          totalInternship += summary.internshipStudents || 0;
          totalServed += summary.servedStudents || 0;
          totalPending += summary.pendingStudents || 0;

          const addBreakdown = (target, source) => {
            if (!source) return;
            target.fasting += source.fasting || 0;
            target.sundayFasting += source.sundayFasting || 0;
            target.muslimFasting += source.muslimFasting || 0;
            target.notFasting += source.notFasting || 0;
          };

          addBreakdown(combinedFastingBreakdown, summary.fastingBreakdown);
          addBreakdown(combinedRegularFasting, summary.regularFastingBreakdown);
          addBreakdown(
            combinedInternshipFasting,
            summary.internshipFastingBreakdown,
          );
          addBreakdown(combinedServedFasting, summary.servedFastingBreakdown);
          addBreakdown(combinedPendingFasting, summary.pendingFastingBreakdown);
        }
      }

      activeSummary = {
        regularStudents: totalRegular,
        internshipStudents: totalInternship,
        servedStudents: totalServed,
        pendingStudents: totalPending,
        fastingBreakdown: combinedFastingBreakdown,
        regularFastingBreakdown: combinedRegularFasting,
        internshipFastingBreakdown: combinedInternshipFasting,
        servedFastingBreakdown: combinedServedFasting,
        pendingFastingBreakdown: combinedPendingFasting,
      };
    } else {
      recentScans = await StationScan.findAll({
        campus: campusId,
        cafeNumber: activeCafeNumber,
        date: mealDayString,
        mealType,
        orderByCreatedAtDesc: true,
        limit: 5,
      });

      const campusStudents = filterStudentsForCafeNumber(
        await CafeStudent.findAll(studentSyncQuery),
        req.campus,
        activeCafeNumber,
      );
      const servedScans = await StationScan.findAll({
        campus: campusId,
        cafeNumber: activeCafeNumber,
        date: mealDayString,
        mealType,
      });

      const servedStudentIds = servedScans.map((s) => s.studentId);

      activeSummary = buildMealSummarySnapshot(
        campusStudents,
        servedStudentIds,
      );

      const meal = await Meal.findOne({
        campus: campusId,
        cafeNumber: activeCafeNumber,
        date: mealDayString,
        year,
        semester,
        mealType,
      });

      if (meal && !meal.summarySnapshot) {
        await Meal.updateById(meal.id, {
          summarySnapshot: activeSummary,
        }).catch(() => null);
      }
    }

    res.json({
      mealType,
      mealLabel: label,
      mealSchedule,
      mealDate: mealDayString,
      cafeNumber: isAllCafes ? 0 : activeCafeNumber,
      cafeDisplayName: isAllCafes
        ? "All Cafes"
        : getCafeDisplayName(req.campus.name, activeCafeNumber),
      totalStudents: totalCampusStudents,
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

// ─── Offline Sync: Upload pending scans from device ──────────────────────────
export const uploadOfflineScans = async (req, res) => {
  try {
    const { scans } = req.body;

    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ message: "No scans provided", results: [] });
    }

    // Cap to 200 scans per request to avoid abuse
    const safeScans = scans.slice(0, 200);
    const studentCampusQuery = getStudentCampusQuery(req.campus);
    const campusForScope = (await User.findById(req.campus.id)) || req.campus;
    const campusCafes = (
      await User.findAll({
        campusId: campusForScope.campusId || campusForScope.id,
        role: "cafe",
      })
    ).sort((a, b) => a.id - b.id);

    const results = [];

    for (const scanItem of safeScans) {
      const { localId, studentId, scannedAt: scannedAtRaw, mealType: providedMealType } = scanItem;

      try {
        // Use device-provided timestamp to determine which meal window it belonged to
        const scanTime = scannedAtRaw ? new Date(scannedAtRaw) : new Date();
        if (Number.isNaN(scanTime.getTime())) {
          results.push({ localId, status: "error", reason: "invalid_timestamp" });
          continue;
        }

        const todayString = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Addis_Ababa",
        }).format(scanTime);

        // Determine meal type from timestamp OR use device-provided one
        const mealSchedule = await getMealScheduleAt(req.campus.id, scanTime);
        const now = scanTime.getTime();

        let currentMealType = providedMealType || null;
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

        // If we couldn't determine the window from time, try to use device-provided meal type
        if (!appliedWindow && currentMealType && mealSchedule[currentMealType]) {
          appliedWindow = mealSchedule[currentMealType];
        }

        if (!currentMealType) {
          results.push({ localId, status: "time_up" });
          continue;
        }

        // Find student
        const student = await CafeStudent.findOne({
          studentId,
          ...studentCampusQuery,
        });

        if (!student) {
          results.push({ localId, status: "not_found" });
          continue;
        }

        // Check cafe assignment
        const assignedCafeNumber = getEffectiveStudentCafeNumber(student, campusForScope);
        if (!assignedCafeNumber || assignedCafeNumber <= 0) {
          results.push({ localId, status: "not_found" });
          continue;
        }

        const accessibleStudents = filterStudentsForCafeNumber(
          [student],
          campusForScope,
          req.cafeNumber,
        );

        if (accessibleStudents.length === 0) {
          const assignedCafeName = getCafeLabelForNumber(campusCafes, assignedCafeNumber);
          results.push({
            localId,
            status: "wrong_cafe",
            assignedCafeNumber,
            assignedCafeName,
          });
          continue;
        }

        const normalizedStudent = normalizeStudent(student);

        // Internship check
        if (getStudentIsInternship(normalizedStudent)) {
          results.push({ localId, status: "internship_denied" });
          continue;
        }

        // Fasting checks
        const today = new Date(`${todayString}T00:00:00+03:00`);
        if (isOrthodoxFastingBreakfastDenied(normalizedStudent, currentMealType, today)) {
          results.push({ localId, status: "fasting_denied", denialCode: "fasting_restriction" });
          continue;
        }
        if (isMuslimFastingMealDenied(normalizedStudent, currentMealType)) {
          results.push({ localId, status: "fasting_denied", denialCode: "fasting_restriction" });
          continue;
        }
        if (isSundayFastingBreakfastDenied(normalizedStudent, currentMealType, today)) {
          results.push({ localId, status: "fasting_denied", denialCode: "fasting_restriction" });
          continue;
        }

        // Check for duplicate in DB
        const existingStationScan = await StationScan.findOne({
          studentId: student.studentId,
          campus: req.campus.id,
          date: todayString,
          mealType: currentMealType,
        });

        if (existingStationScan) {
          // Treat as success — the scan is already saved (maybe from another device or earlier upload)
          results.push({ localId, status: "duplicate", stationScanId: existingStationScan.id });
          continue;
        }

        // Save the scan
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
          cafeNumber: req.cafeNumber,
          date: todayString,
          mealType: currentMealType,
          scannedAt: scanTime,
        });

        // Update meal record (best effort)
        try {
          const campusStudents = filterStudentsForCafeNumber(
            await CafeStudent.findAll(studentCampusQuery),
            req.campus,
            req.cafeNumber,
          );
          const campusSnapshot = createCampusSnapshot(req.campus);
          const studentSnapshot = createStudentSnapshot(normalizedStudent, req.campus, scanTime);

          const existingMeal = await Meal.findOne({
            campus: req.campus.id,
            cafeNumber: req.cafeNumber,
            mealType: currentMealType,
            date: todayString,
          });

          if (existingMeal) {
            const students = Array.from(
              new Set([...(existingMeal.students || []).map(String), String(student.studentId)]),
            );
            const studentSnapshots = [
              ...(existingMeal.studentSnapshots || []).filter(
                (s) => String(s.studentId) !== String(student.studentId),
              ),
              studentSnapshot,
            ];
            await Meal.updateById(existingMeal.id, {
              students,
              studentSnapshots,
              summarySnapshot: buildMealSummarySnapshot(campusStudents, students),
            });
          } else {
            const actualOpenedAt = appliedWindow
              ? getBoundedOpenedAt(req.campus.lastActiveAt || scanTime, appliedWindow, todayString)
              : scanTime.toISOString();
            await Meal.create({
              campus: req.campus.id,
              cafeNumber: req.cafeNumber,
              mealType: currentMealType,
              date: todayString,
              year: getCurrentYear(today),
              semester: getCurrentSemester(today),
              campusSnapshot,
              appliedWindow: appliedWindow
                ? {
                    start: appliedWindow.start,
                    end: appliedWindow.end,
                    label: getMealWindowLabel(appliedWindow),
                    actualOpenedAt,
                    actualClosedAt: null,
                  }
                : null,
              studentSnapshots: [studentSnapshot],
              summarySnapshot: buildMealSummarySnapshot(campusStudents, [String(student.studentId)]),
              students: [String(student.studentId)],
            });
          }
        } catch (mealErr) {
          console.error("uploadOfflineScans: meal record update failed:", mealErr.message);
        }

        // Attendance + history snapshots (best effort)
        try {
          let activeConfig = await mealSessionConfigHistory.findActiveConfig(
            req.campus.id,
            currentMealType,
            todayString,
          );
          if (!activeConfig && appliedWindow) {
            activeConfig = await mealSessionConfigHistory.create({
              sessionName: currentMealType,
              startTime: appliedWindow.start,
              endTime: appliedWindow.end,
              appliedDate: todayString,
              appliedTimestamp: new Date(),
              campusId: req.campus.id,
              createdBy: req.campus.id,
              version: 1,
            });
          }

          if (activeConfig) {
            await mealAttendanceSnapshot.create({
              studentId: student.studentId,
              studentDetails: normalizedStudent,
              fastingType: normalizedStudent.fastingType,
              campusId: req.campus.id,
              cafeteria: req.cafeNumber,
              mealSession: currentMealType,
              sessionStartTime: appliedWindow?.start,
              sessionEndTime: appliedWindow?.end,
              attendanceDate: todayString,
              scanTimestamp: scanTime,
              appliedSessionConfigId: activeConfig.id,
            }).catch(() => null);
          }

          await MealScanHistory.create({
            studentId: student.studentId,
            studentName: normalizedStudent.name,
            mealSession: currentMealType,
            date: todayString,
            exactScanTimestamp: scanTime,
            cafeteria: req.cafeNumber,
            campus: req.campus.id,
            fastingTypeAtScanTime: normalizedStudent.fastingType,
          }).catch(() => null);

          const existingSnapshot = await MealSessionSnapshot.findOne({
            campusId: req.campus.id,
            cafeteriaId: req.cafeNumber,
            date: todayString,
            mealSession: currentMealType,
          });

          if (existingSnapshot) {
            const newServedCount = existingSnapshot.servedCount + 1;
            await MealSessionSnapshot.updateById(existingSnapshot.id, {
              servedCount: newServedCount,
              unservedCount: Math.max(0, existingSnapshot.assignedStudents - newServedCount),
            });
          }
        } catch (snapErr) {
          console.error("uploadOfflineScans: snapshot/history failed:", snapErr.message);
        }

        results.push({ localId, status: "ok", stationScanId: stationScan.id });
      } catch (itemErr) {
        console.error("uploadOfflineScans: item error for", studentId, itemErr.message);
        results.push({ localId, status: "error", reason: "server_error" });
      }
    }

    return res.json({ results });
  } catch (err) {
    logInternalError("upload-offline-scans", err);
    sendServerError(res, "Could not process offline scans. Please try again.");
  }
};

// ─── Offline Sync: Get current session state (scanned IDs + schedule) ────────
export const getSyncSession = async (req, res) => {
  try {
    const now = new Date();
    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
    }).format(now);

    const mealSchedule = await getMealScheduleAt(req.campus.id, now);

    let currentMealType = null;
    let currentWindow = null;

    for (const [mealType, window] of Object.entries(mealSchedule)) {
      const start = getAppliedWindowDate(todayString, window?.start)?.getTime();
      const end = getAppliedWindowDate(todayString, window?.end)?.getTime();
      const nowMs = now.getTime();

      if (start && end && nowMs >= start && nowMs <= end) {
        currentMealType = mealType;
        currentWindow = window;
        break;
      }
    }

    // Get all scanned student IDs for today's session in this cafe
    const scannedStudentIds = [];
    if (currentMealType) {
      const scans = await StationScan.findAll({
        campus: req.campus.id,
        cafeNumber: req.cafeNumber,
        date: todayString,
        mealType: currentMealType,
      });
      scannedStudentIds.push(...scans.map((s) => s.studentId));
    }

    return res.json({
      mealSchedule,
      currentMealType,
      currentWindow,
      scannedStudentIds,
      date: todayString,
      serverTime: now.toISOString(),
    });
  } catch (err) {
    logInternalError("sync-session", err);
    sendServerError(res, "Could not load session sync data. Please try again.");
  }
};

// ─── Offline Sync: Get student list for this campus/cafe ─────────────────────
export const getSyncStudents = async (req, res) => {
  try {
    const studentCampusQuery = getStudentCampusQuery(req.campus);
    const campusForScope = (await User.findById(req.campus.id)) || req.campus;

    const allStudents = await CafeStudent.findAll(studentCampusQuery);
    const cafeStudents = filterStudentsForCafeNumber(
      allStudents,
      campusForScope,
      req.cafeNumber,
    );

    const students = cafeStudents.map((s) => ({
      studentId: s.studentId,
      name: s.name,
      department: s.department || "",
      batch: s.batch ?? null,
      fastingType: s.fastingType || "not_fasting",
      isInternship: Boolean(s.isInternship),
      cafeNumber: s.cafeNumber ?? null,
      profileUrl: s.profileUrl || null,
    }));

    return res.json({ students, campusId: req.campus.id, cafeNumber: req.cafeNumber });
  } catch (err) {
    logInternalError("sync-students", err);
    sendServerError(res, "Could not load student sync data. Please try again.");
  }
};
