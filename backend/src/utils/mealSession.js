import StationScan from "../models/stationScan.model.js";
import MealSchedule from "../models/mealSchedule.model.js";

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

const DEFAULT_KEY = "default";
const MEAL_ORDER = ["breakfast", "lunch", "dinner"];

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

const getMinutesFromDate = (currentDate = new Date()) =>
  currentDate.getHours() * 60 + currentDate.getMinutes();

export const formatTimeLabel = (value) => value || "--:--";

export const formatMealScheduleForResponse = (schedule = DEFAULT_MEAL_SCHEDULE) =>
  MEAL_ORDER.reduce((accumulator, mealType) => {
    const mealWindow = schedule[mealType] || DEFAULT_MEAL_SCHEDULE[mealType];

    accumulator[mealType] = {
      start: mealWindow.start,
      end: mealWindow.end,
      label: `${formatTimeLabel(mealWindow.start)} - ${formatTimeLabel(mealWindow.end)}`,
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

export const getMealSchedule = async () => {
  let schedule = await MealSchedule.findOne({ key: DEFAULT_KEY }).lean();

  if (!schedule) {
    schedule = (
      await MealSchedule.create({
        key: DEFAULT_KEY,
        ...DEFAULT_MEAL_SCHEDULE,
      })
    ).toObject();
  }

  return formatMealScheduleForResponse(schedule);
};

export const getCurrentMealType = async (currentDate = new Date()) => {
  const schedule = await getMealSchedule();
  const currentMinutes = getMinutesFromDate(currentDate);

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

export const getDashboardMealContext = async (currentDate = new Date()) => {
  const schedule = await getMealSchedule();
  const current = new Date(currentDate);
  const currentMinutes = getMinutesFromDate(current);

  const dinnerStart = parseTimeToMinutes(schedule.dinner.start);
  const lunchStart = parseTimeToMinutes(schedule.lunch.start);
  const breakfastStart = parseTimeToMinutes(schedule.breakfast.start);

  if (currentMinutes >= dinnerStart) {
    return {
      mealType: "dinner",
      label: getMealLabel("dinner"),
      targetDate: current,
    };
  }

  if (currentMinutes >= lunchStart) {
    return {
      mealType: "lunch",
      label: getMealLabel("lunch"),
      targetDate: current,
    };
  }

  if (currentMinutes >= breakfastStart) {
    return {
      mealType: "breakfast",
      label: getMealLabel("breakfast"),
      targetDate: current,
    };
  }

  const previousDay = new Date(current);
  previousDay.setDate(previousDay.getDate() - 1);

  return {
    mealType: "dinner",
    label: getMealLabel("dinner"),
    targetDate: previousDay,
  };
};

export const getCurrentSemester = (currentDate = new Date()) => {
  const month = currentDate.getMonth() + 1;
  return month >= 9 || month <= 2 ? "first" : "second";
};

export const getCurrentYear = (currentDate = new Date()) =>
  currentDate.getFullYear();

export const getDayString = (currentDate = new Date()) => {
  const normalizedDate = new Date(currentDate);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate.toISOString().split("T")[0];
};

export const getDateFromDayString = (dayString) => {
  const date = new Date(dayString);
  date.setHours(0, 0, 0, 0);
  return date;
};

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

  const currentMinutes = getMinutesFromDate(currentDate);
  const startMinutes = parseTimeToMinutes(mealWindow.start);
  const endMinutes = parseTimeToMinutes(mealWindow.end);

  if (currentMinutes < startMinutes) return "upcoming";
  if (currentMinutes >= endMinutes) return "completed";
  return "active";
};

export const getMealSessionWindowSync = (mealType, targetDate, schedule) => {
  const mealWindow = schedule[mealType];
  if (!mealWindow) return null;

  const baseDate =
    typeof targetDate === "string"
      ? getDateFromDayString(targetDate)
      : new Date(targetDate);

  const startMinutes = parseTimeToMinutes(mealWindow.start);
  const endMinutes = parseTimeToMinutes(mealWindow.end);

  const start = new Date(baseDate);
  start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

  const end = new Date(baseDate);
  end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

  return { start, end };
};

export const getMealSessionStatus = async (
  mealType,
  targetDate,
  currentDate = new Date(),
) => {
  const schedule = await getMealSchedule();
  return getMealSessionStatusSync(mealType, targetDate, schedule, currentDate);
};

export const getMealSessionWindow = async (mealType, targetDate) => {
  const schedule = await getMealSchedule();
  return getMealSessionWindowSync(mealType, targetDate, schedule);
};

export const getMealSnapshotCutoff = async (
  mealType,
  targetDate,
  currentDate = new Date(),
) => {
  const schedule = await getMealSchedule();
  const status = getMealSessionStatusSync(
    mealType,
    targetDate,
    schedule,
    currentDate,
  );

  if (status === "upcoming" || status === "unknown") {
    return null;
  }

  const sessionWindow = getMealSessionWindowSync(mealType, targetDate, schedule);
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
  const schedule = await getMealSchedule();
  const stationScans = await StationScan.find({ campus: campusId })
    .select("_id date mealType")
    .lean();

  const expiredScanIds = [];

  for (const stationScan of stationScans) {
    if (
      getMealSessionStatusSync(
        stationScan.mealType,
        stationScan.date,
        schedule,
        currentDate,
      ) === "completed"
    ) {
      expiredScanIds.push(stationScan._id);
    }
  }

  if (expiredScanIds.length === 0) {
    return { clearedScans: 0 };
  }

  const deleteResult = await StationScan.deleteMany({
    _id: { $in: expiredScanIds },
  });

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

  if (meal.students.length !== uniqueStudentIds.length && meal.save) {
    meal.students = uniqueStudentIds;
    await meal.save();
  }

  return uniqueStudentIds;
};
