import StationScan from "../models/stationScan.model.js";
import MealSchedule from "../models/mealSchedule.model.js";
import Meal from "../models/meal.model.js";
import Campus from "../models/campus.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import { getStudentCampusQuery } from "./campusId.js";
import { filterStudentsForCafeNumber } from "./cafeScope.js";
import {
  getStudentFastingType,
  getStudentIsInternship,
} from "./studentDefaults.js";
import {
  getAppDayString,
  getAppMinutesFromDate,
  getAppMonth,
  getAppYear,
  getDateFromAppDayString,
} from "./appTimezone.js";

export const DEFAULT_MEAL_SCHEDULE = {
  breakfast: { start: "06:00", end: "09:00" },
  lunch: { start: "11:00", end: "14:00" },
  dinner: { start: "17:00", end: "20:00" },
};

export const MEAL_LABELS = {
  breakfast: "ቁርስ",
  lunch: "ምሳ",
  dinner: "እራት",
};

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];

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
  location: campus.location || "",
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

const parseTimeToMinutes = (value) => {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hourText, minuteText] = value.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

export const formatTimeLabel = (value) => value || "--:--";
export const getMealWindowLabel = (mealWindow = {}) =>
  `${formatTimeLabel(mealWindow.start)} - ${formatTimeLabel(mealWindow.end)}`;

export const formatMealScheduleForResponse = (
  schedule = DEFAULT_MEAL_SCHEDULE,
) =>
  MEAL_ORDER.reduce((accumulator, mealType) => {
    const mealWindow = schedule[mealType] || DEFAULT_MEAL_SCHEDULE[mealType];

    accumulator[mealType] = {
      start: mealWindow.start,
      end: mealWindow.end,
      label: getMealWindowLabel(mealWindow),
    };

    return accumulator;
  }, {});

export const validateMealScheduleInput = (payload = {}) => {
  for (const mealType of MEAL_ORDER) {
    const mealWindow = payload[mealType];

    if (!mealWindow || typeof mealWindow !== "object") {
      return `Please provide ${mealType} start and end time.`;
    }

    const startMinutes = parseTimeToMinutes(mealWindow.start);
    const endMinutes = parseTimeToMinutes(mealWindow.end);

    if (startMinutes === null || endMinutes === null) {
      return `Please use HH:MM format for ${mealType}.`;
    }

    if (startMinutes >= endMinutes) {
      return `${mealType} start time must be earlier than end time.`;
    }
  }

  for (let index = 0; index < MEAL_ORDER.length - 1; index += 1) {
    const currentMeal = MEAL_ORDER[index];
    const nextMeal = MEAL_ORDER[index + 1];
    const currentEnd = parseTimeToMinutes(payload[currentMeal].end);
    const nextStart = parseTimeToMinutes(payload[nextMeal].start);

    if (currentEnd > nextStart) {
      return `${currentMeal} must end before ${nextMeal} starts.`;
    }
  }

  return null;
};

export const getMealSchedule = async (campusId) => {
  if (!campusId) {
    return formatMealScheduleForResponse(DEFAULT_MEAL_SCHEDULE);
  }

  const schedule = await MealSchedule.findOne({ campusId });
  return formatMealScheduleForResponse(schedule || DEFAULT_MEAL_SCHEDULE);
};

export const getMealScheduleAt = async (
  campusId,
  referenceDate = new Date(),
) => {
  if (!campusId) {
    return formatMealScheduleForResponse(DEFAULT_MEAL_SCHEDULE);
  }

  const baseSchedule = await getMealSchedule(campusId);
  const referenceDay = getAppDayString(referenceDate);
  const meals = await Meal.findAll({ campus: campusId, date: referenceDay });

  if (meals.length === 0) {
    return baseSchedule;
  }

  return MEAL_ORDER.reduce(
    (schedule, mealType) => {
      const meal = meals.find((entry) => entry.mealType === mealType);
      const appliedWindow = meal?.appliedWindow;

      if (!appliedWindow?.start || !appliedWindow?.end) {
        return schedule;
      }

      schedule[mealType] = {
        start: appliedWindow.start,
        end: appliedWindow.end,
        label: getMealWindowLabel(appliedWindow),
      };

      return schedule;
    },
    { ...baseSchedule },
  );
};

export const getCurrentMealType = async (
  campusId,
  currentDate = new Date(),
) => {
  const schedule = await getMealSchedule(campusId);
  const currentMinutes = getAppMinutesFromDate(currentDate);

  for (const mealType of MEAL_ORDER) {
    const mealWindow = schedule[mealType];
    const startMinutes = parseTimeToMinutes(mealWindow.start);
    const endMinutes = parseTimeToMinutes(mealWindow.end);

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return mealType;
    }
  }

  return null;
};

export const getMealLabel = (mealType) => MEAL_LABELS[mealType] || mealType;

export const getDashboardMealContext = async (
  campusId,
  currentDate = new Date(),
) => {
  const schedule = await getMealSchedule(campusId);
  const current = new Date(currentDate);
  const currentMinutes = getAppMinutesFromDate(current);

  const breakfastStart = parseTimeToMinutes(schedule.breakfast?.start);
  const lunchStart = parseTimeToMinutes(schedule.lunch?.start);
  const dinnerStart = parseTimeToMinutes(schedule.dinner?.start);

  if (
    dinnerStart !== null &&
    breakfastStart !== null &&
    (currentMinutes >= dinnerStart || currentMinutes < breakfastStart)
  ) {
    return {
      mealType: "dinner",
      label: getMealLabel("dinner"),
      targetDate: current,
    };
  }

  if (
    lunchStart !== null &&
    dinnerStart !== null &&
    currentMinutes >= lunchStart &&
    currentMinutes < dinnerStart
  ) {
    return {
      mealType: "lunch",
      label: getMealLabel("lunch"),
      targetDate: current,
    };
  }

  if (
    breakfastStart !== null &&
    lunchStart !== null &&
    currentMinutes >= breakfastStart &&
    currentMinutes < lunchStart
  ) {
    return {
      mealType: "breakfast",
      label: getMealLabel("breakfast"),
      targetDate: current,
    };
  }

  return {
    mealType: "breakfast",
    label: getMealLabel("breakfast"),
    targetDate: current,
  };
};

export const getCurrentSemester = (currentDate = new Date()) => {
  const month = getAppMonth(currentDate);
  return month >= 9 || month <= 2 ? "first" : "second";
};

export const getCurrentYear = (currentDate = new Date()) => getAppYear(currentDate);

export const getDayString = (currentDate = new Date()) => getAppDayString(currentDate);

export const getDateFromDayString = (dayString) =>
  getDateFromAppDayString(dayString);

export const getMealSessionStatusSync = (
  mealType,
  targetDate,
  schedule,
  currentDate = new Date(),
) => {
  const mealWindow = schedule[mealType];
  if (!mealWindow) return "unknown";

  const targetDayString =
    typeof targetDate === "string" ? targetDate : getDayString(targetDate);
  const currentDayString = getDayString(currentDate);

  if (targetDayString < currentDayString) return "completed";
  if (targetDayString > currentDayString) return "upcoming";

  const currentMinutes = getAppMinutesFromDate(currentDate);
  const startMinutes = parseTimeToMinutes(mealWindow.start);
  const endMinutes = parseTimeToMinutes(mealWindow.end);

  if (currentMinutes < startMinutes) return "upcoming";
  if (currentMinutes >= endMinutes) return "completed";
  return "active";
};

export const CAMPUS_LIVE_WINDOW_MS = 5 * 60 * 1000;

export const isCampusLiveNow = (campus, currentDate = new Date()) => {
  const lastActiveAt = campus?.lastActiveAt
    ? new Date(campus.lastActiveAt)
    : null;

  return (
    Boolean(campus?.isOnline) &&
    Boolean(lastActiveAt) &&
    !Number.isNaN(lastActiveAt.getTime()) &&
    currentDate.getTime() - lastActiveAt.getTime() <= CAMPUS_LIVE_WINDOW_MS
  );
};

export const getMealSessionWindowSync = (mealType, targetDate, schedule) => {
  const mealWindow = schedule[mealType];
  if (!mealWindow) return null;

  const dayString =
    typeof targetDate === "string" ? targetDate : getAppDayString(targetDate);

  const startMinutes = parseTimeToMinutes(mealWindow.start);
  const endMinutes = parseTimeToMinutes(mealWindow.end);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  const toClockTime = (totalMinutes) =>
    `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60,
    ).padStart(2, "0")}:00`;

  return {
    start: getDateFromAppDayString(dayString, toClockTime(startMinutes)),
    end: getDateFromAppDayString(dayString, toClockTime(endMinutes)),
  };
};

export const getMealSessionStatus = async (
  campusId,
  mealType,
  targetDate,
  currentDate = new Date(),
) => {
  const targetDayString =
    typeof targetDate === "string" ? targetDate : getDayString(targetDate);
  const currentDayString = getDayString(currentDate);
  const scheduleReferenceDate =
    targetDayString === currentDayString ? currentDate : targetDate;
  const schedule = await getMealScheduleAt(campusId, scheduleReferenceDate);
  return getMealSessionStatusSync(mealType, targetDate, schedule, currentDate);
};

export const getMealSessionWindow = async (campusId, mealType, targetDate) => {
  const schedule = await getMealScheduleAt(campusId, targetDate);
  return getMealSessionWindowSync(mealType, targetDate, schedule);
};

export const syncCampusLiveMealWindow = async (
  campusId,
  currentDate = new Date(),
  options = {},
) => {
  if (!campusId) {
    return null;
  }

  const currentMealType = await getCurrentMealType(campusId, currentDate);
  if (!currentMealType) {
    return null;
  }
  const cafeNumber = Number(options.cafeNumber);
  if (!Number.isInteger(cafeNumber) || cafeNumber < 1) {
    return null;
  }

  const targetDayString = getDayString(currentDate);
  const mealSchedule = await getMealSchedule(campusId);
  const appliedWindow = mealSchedule?.[currentMealType];
  const campusRecord = await Campus.findById(campusId);
  const campusStudents = campusRecord
    ? filterStudentsForCafeNumber(
        await CafeStudent.findAll(getStudentCampusQuery(campusRecord)),
        campusRecord,
        cafeNumber,
      )
    : [];
  const campusSnapshot = createCampusSnapshot({
    ...(campusRecord || { id: campusId }),
    selectedCafeNumber: cafeNumber,
  });

  if (!appliedWindow?.start || !appliedWindow?.end) {
    return null;
  }

  const appliedSessionWindow = getMealSessionWindowSync(
    currentMealType,
    targetDayString,
    mealSchedule,
  );
  const onlineSince = options.onlineSince
    ? new Date(options.onlineSince)
    : campusRecord?.lastActiveAt
      ? new Date(campusRecord.lastActiveAt)
      : null;
  const wasOnlineBeforeSessionStart =
    Boolean(campusRecord?.isOnline) &&
    Boolean(onlineSince) &&
    !Number.isNaN(onlineSince.getTime()) &&
    appliedSessionWindow?.start &&
    onlineSince.getTime() <= appliedSessionWindow.start.getTime();
  const actualOpenedAt =
    wasOnlineBeforeSessionStart && appliedSessionWindow?.start
      ? appliedSessionWindow.start.toISOString()
      : currentDate.toISOString();

  const existingMeal = await Meal.findOne({
    campus: campusId,
    cafeNumber,
    mealType: currentMealType,
    date: targetDayString,
  });

  if (existingMeal) {
    const existingAppliedWindow = existingMeal.appliedWindow || {};

    if (
      existingAppliedWindow.actualOpenedAt &&
      existingAppliedWindow.actualClosedAt === null
    ) {
      return existingMeal;
    }

    return Meal.updateById(existingMeal.id, {
      appliedWindow: {
        ...existingAppliedWindow,
        start: existingAppliedWindow.start || appliedWindow.start,
        end: existingAppliedWindow.end || appliedWindow.end,
        label: existingAppliedWindow.label || getMealWindowLabel(appliedWindow),
        actualOpenedAt: existingAppliedWindow.actualOpenedAt || actualOpenedAt,
        actualClosedAt: null,
      },
      campusSnapshot: existingMeal.campusSnapshot || campusSnapshot,
      summarySnapshot:
        existingMeal.summarySnapshot ||
        buildMealSummarySnapshot(campusStudents, existingMeal.students || []),
    });
  }

  return Meal.create({
    campus: campusId,
    cafeNumber,
    mealType: currentMealType,
    date: targetDayString,
    year: getCurrentYear(targetDay),
    semester: getCurrentSemester(targetDay),
    campusSnapshot,
    appliedWindow: {
      start: appliedWindow.start,
      end: appliedWindow.end,
      label: getMealWindowLabel(appliedWindow),
      actualOpenedAt,
      actualClosedAt: null,
    },
    summarySnapshot: buildMealSummarySnapshot(campusStudents, []),
    studentSnapshots: [],
    students: [],
  });
};

export const getMealSnapshotCutoff = async (
  campusId,
  mealType,
  targetDate,
  currentDate = new Date(),
) => {
  const targetDayString =
    typeof targetDate === "string" ? targetDate : getDayString(targetDate);
  const currentDayString = getDayString(currentDate);
  const scheduleReferenceDate =
    targetDayString === currentDayString ? currentDate : targetDate;
  const schedule = await getMealScheduleAt(campusId, scheduleReferenceDate);
  const status = getMealSessionStatusSync(
    mealType,
    targetDate,
    schedule,
    currentDate,
  );

  if (status === "upcoming" || status === "unknown") {
    return null;
  }

  const sessionWindow = getMealSessionWindowSync(
    mealType,
    targetDate,
    schedule,
  );
  if (!sessionWindow) {
    return null;
  }

  if (status === "active") {
    return currentDate;
  }

  return sessionWindow.end;
};

export const finalizeExpiredStationScans = async (
  campusId,
  currentDate = new Date(),
) => {
  const schedule = await getMealScheduleAt(campusId, currentDate);
  const stationScans = await StationScan.findAll({ campus: campusId });
  const dashboardMealContext = await getDashboardMealContext(
    campusId,
    currentDate,
  );
  const activeDashboardMealType = dashboardMealContext?.mealType || null;
  const activeDashboardDayString = dashboardMealContext?.targetDate
    ? getDayString(dashboardMealContext.targetDate)
    : null;

  const expiredScansByMealKey = new Map();

  for (const stationScan of stationScans) {
    const sessionStatus = getMealSessionStatusSync(
      stationScan.mealType,
      stationScan.date,
      schedule,
      currentDate,
    );
    const isCurrentDashboardSnapshot =
      stationScan.mealType === activeDashboardMealType &&
      stationScan.date === activeDashboardDayString;

    if (sessionStatus === "completed" && !isCurrentDashboardSnapshot) {
      const mealKey = `${stationScan.date}:${stationScan.mealType}`;
      const existingGroup = expiredScansByMealKey.get(mealKey) || [];
      existingGroup.push(stationScan);
      expiredScansByMealKey.set(mealKey, existingGroup);
    }
  }

  const expiredScanIds = Array.from(expiredScansByMealKey.values())
    .flat()
    .map((scan) => scan.id);

  if (expiredScanIds.length === 0) {
    return { clearedScans: 0 };
  }

  for (const [mealKey, scans] of expiredScansByMealKey.entries()) {
    const separatorIndex = mealKey.lastIndexOf(":");
    const date =
      separatorIndex >= 0 ? mealKey.slice(0, separatorIndex) : mealKey;
    const mealType =
      separatorIndex >= 0 ? mealKey.slice(separatorIndex + 1) : "";
    const meal = await Meal.findOne({
      campus: campusId,
      date,
      mealType,
    });

    if (!meal) {
      continue;
    }

    const appliedWindow = meal.appliedWindow || {};
    if (appliedWindow.actualClosedAt) {
      continue;
    }

    const latestScan = scans.reduce((latest, scan) => {
      const latestAt = new Date(latest.scannedAt || latest.createdAt || 0);
      const scanAt = new Date(scan.scannedAt || scan.createdAt || 0);
      return scanAt > latestAt ? scan : latest;
    }, scans[0]);
    const actualClosedAt =
      latestScan?.scannedAt || latestScan?.createdAt || null;

    if (!actualClosedAt) {
      continue;
    }

    await Meal.updateById(meal.id, {
      appliedWindow: {
        ...appliedWindow,
        actualClosedAt,
      },
    });
  }

  const deleteResult = await StationScan.deleteMany({ ids: expiredScanIds });

  return {
    clearedScans: deleteResult.deletedCount ?? 0,
  };
};

export const getUniqueStudentIds = (students = []) =>
  Array.from(new Set(students.map((studentId) => studentId.toString())));

export const dedupeMealStudents = async (meal) => {
  if (!meal?.students) {
    return [];
  }

  const uniqueStudentIds = getUniqueStudentIds(meal.students);

  if (meal.students.length !== uniqueStudentIds.length && meal.id) {
    await Meal.updateById(meal.id, { students: uniqueStudentIds });
  }

  return uniqueStudentIds;
};
