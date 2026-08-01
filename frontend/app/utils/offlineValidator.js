/**
 * offlineValidator.js
 * Mirrors the backend's meal validation logic using locally cached student data.
 * Returns the same shape as the server's station-scan response so the scan page
 * can display the exact same result cards offline.
 */

import { isScannedLocally, loadStudents } from "./offlineStore.js";

// ─── Helpers (mirrors stationScan.controller.js) ──────────────────────────────

const getStudentFastingType = (student) =>
  student?.fastingType || "not_fasting";

const getStudentIsInternship = (student) =>
  student?.isInternship === true || student?.isInternship === 1;

/**
 * Returns 0=Sun,1=Mon...6=Sat for a given Date in Africa/Addis_Ababa timezone.
 */
const getAppDayOfWeek = (date = new Date()) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
};

const isOrthodoxFastingBreakfastDenied = (student, mealType, date) => {
  if (mealType !== "breakfast") return false;
  if (getStudentFastingType(student) !== "fasting") return false;
  const day = getAppDayOfWeek(date);
  return day >= 1 && day <= 5; // Mon–Fri
};

const isMuslimFastingMealDenied = (student, mealType) => {
  if (getStudentFastingType(student) !== "muslim_fasting") return false;
  return mealType !== "dinner";
};

const isSundayFastingBreakfastDenied = (student, mealType, date) => {
  if (mealType !== "breakfast") return false;
  if (getStudentFastingType(student) !== "sunday_fasting") return false;
  return getAppDayOfWeek(date) === 0; // Sunday
};

// ─── Cafe assignment (mirrors cafeScope.js) ───────────────────────────────────

/**
 * Gets the effective cafe number for a student.
 * Checks student.cafeNumber first, then falls back to batchCafeAssignments on campus.
 */
const getEffectiveStudentCafeNumber = (student, campusMeta) => {
  const explicitCafe = Number(student?.cafeNumber);
  if (explicitCafe === 0) return null;
  if (Number.isInteger(explicitCafe) && explicitCafe > 0) return explicitCafe;

  // Fallback: batch-based assignment from campusMeta
  const assignments =
    campusMeta?.batchCafeAssignments &&
    typeof campusMeta.batchCafeAssignments === "object" &&
    !Array.isArray(campusMeta.batchCafeAssignments)
      ? campusMeta.batchCafeAssignments
      : {};

  const batchKey = String(student?.batch ?? "").trim();
  if (!batchKey) return null;

  const assigned = Number(assignments[batchKey]);
  return Number.isInteger(assigned) && assigned > 0 ? assigned : null;
};

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * Validate a scan entirely from local data.
 *
 * @param {object} params
 * @param {string} params.studentId
 * @param {number|string} params.campusId   - campus DB id
 * @param {number}        params.cafeNum    - active cafe number on this device
 * @param {string}        params.mealType   - "breakfast"|"lunch"|"dinner"
 * @param {string}        params.date       - "YYYY-MM-DD"
 * @param {object}        [params.campusMeta] - campus object with batchCafeAssignments
 * @returns {{ allowed: boolean, student: object|null, denialCode: string|null, message: string, statusMessage: string }}
 */
export const validateScanLocally = ({
  studentId,
  campusId,
  cafeNum,
  mealType,
  date,
  campusMeta = {},
}) => {
  const students = loadStudents(campusId, cafeNum);

  // 1. Student lookup
  const student = students.find(
    (s) => String(s.studentId) === String(studentId),
  );

  if (!student) {
    return {
      allowed: false,
      student: { name: "Student not found", studentId },
      denialCode: null,
      message: "Student not found",
      statusMessage: "",
    };
  }

  // 2. Cafe assignment check
  const assignedCafe = getEffectiveStudentCafeNumber(student, campusMeta);
  if (!assignedCafe || assignedCafe <= 0) {
    const msg = "አልተፈቀደም";
    return {
      allowed: false,
      student: { ...student, statusMessage: msg },
      denialCode: null,
      message: msg,
      statusMessage: msg,
    };
  }

  if (assignedCafe !== Number(cafeNum)) {
    const cafeMismatchMsg = `የተመደቡበት ካፌ ${assignedCafe}`;
    return {
      allowed: false,
      student: {
        ...student,
        assignedCafeNumber: assignedCafe,
        statusMessage: cafeMismatchMsg,
      },
      denialCode: null,
      message: cafeMismatchMsg,
      statusMessage: cafeMismatchMsg,
    };
  }

  // 3. Internship check
  if (getStudentIsInternship(student)) {
    const msg = "አልተፈቀደም";
    return {
      allowed: false,
      student: { ...student, statusMessage: msg },
      denialCode: null,
      message: msg,
      statusMessage: msg,
    };
  }

  // 4. Fasting checks
  const now = new Date();

  if (isOrthodoxFastingBreakfastDenied(student, mealType, now)) {
    const msg = "አልተፈቀደም";
    return {
      allowed: false,
      student: { ...student, statusMessage: msg },
      denialCode: "fasting_restriction",
      message: msg,
      statusMessage: msg,
    };
  }

  if (isMuslimFastingMealDenied(student, mealType)) {
    const msg = "አልተፈቀደም";
    return {
      allowed: false,
      student: { ...student, statusMessage: msg },
      denialCode: "fasting_restriction",
      message: msg,
      statusMessage: msg,
    };
  }

  if (isSundayFastingBreakfastDenied(student, mealType, now)) {
    const msg = "አልተፈቀደም";
    return {
      allowed: false,
      student: { ...student, statusMessage: msg },
      denialCode: "fasting_restriction",
      message: msg,
      statusMessage: msg,
    };
  }

  // 5. Local duplicate check
  if (isScannedLocally(campusId, cafeNum, date, mealType, studentId)) {
    const msg = "አልተፈቀደም";
    return {
      allowed: false,
      student: { ...student, statusMessage: msg, denialCode: "duplicate" },
      denialCode: "duplicate",
      message: msg,
      statusMessage: msg,
    };
  }

  // ✅ Allowed
  return {
    allowed: true,
    student,
    denialCode: null,
    message: "Allowed to Eat",
    statusMessage: "ተፈቅዷል",
  };
};

/**
 * Determine the current meal type from a locally cached schedule.
 * Returns { mealType, window } or { mealType: null, window: null }.
 */
export const getCurrentMealTypeLocal = (schedule) => {
  if (!schedule) return { mealType: null, window: null };

  const now = new Date();
  const todayString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
  }).format(now);

  for (const [mealType, win] of Object.entries(schedule)) {
    if (!win?.start || !win?.end) continue;
    const start = new Date(`${todayString}T${win.start}:00+03:00`).getTime();
    const end = new Date(`${todayString}T${win.end}:00+03:00`).getTime();
    const nowMs = now.getTime();
    if (nowMs >= start && nowMs <= end) {
      return { mealType, window: win };
    }
  }

  return { mealType: null, window: null };
};

/**
 * Get today's date string in Africa/Addis_Ababa timezone (YYYY-MM-DD).
 */
export const getTodayString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
  }).format(new Date());
