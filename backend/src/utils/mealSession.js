import StationScan from "../models/stationScan.model.js";

const MEAL_WINDOWS = {
  breakfast: { startHour: 6, endHour: 11 },
  lunch: { startHour: 11, endHour: 14 },
  dinner: { startHour: 17, endHour: 20 },
};

export const getCurrentMealType = (currentDate = new Date()) => {
  const hour = currentDate.getHours();

  for (const [mealType, window] of Object.entries(MEAL_WINDOWS)) {
    if (hour >= window.startHour && hour < window.endHour) {
      return mealType;
    }
  }

  return null;
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

export const getMealSessionStatus = (
  mealType,
  targetDate,
  currentDate = new Date(),
) => {
  const mealWindow = MEAL_WINDOWS[mealType];
  if (!mealWindow) return "unknown";

  const targetDayString =
    typeof targetDate === "string" ? targetDate : getDayString(targetDate);
  const currentDayString = getDayString(currentDate);

  if (targetDayString < currentDayString) return "completed";
  if (targetDayString > currentDayString) return "upcoming";

  const hour = currentDate.getHours();
  if (hour < mealWindow.startHour) return "upcoming";
  if (hour >= mealWindow.endHour) return "completed";
  return "active";
};

export const getMealSessionWindow = (mealType, targetDate) => {
  const mealWindow = MEAL_WINDOWS[mealType];
  if (!mealWindow) return null;

  const baseDate =
    typeof targetDate === "string"
      ? getDateFromDayString(targetDate)
      : new Date(targetDate);

  const start = new Date(baseDate);
  start.setHours(mealWindow.startHour, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(mealWindow.endHour, 0, 0, 0);

  return { start, end };
};

export const getMealSnapshotCutoff = (
  mealType,
  targetDate,
  currentDate = new Date(),
) => {
  const status = getMealSessionStatus(mealType, targetDate, currentDate);
  if (status === "upcoming" || status === "unknown") {
    return null;
  }

  const sessionWindow = getMealSessionWindow(mealType, targetDate);
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
  const stationScans = await StationScan.find({ campus: campusId })
    .select("_id date mealType")
    .lean();

  const expiredScanIds = [];

  for (const stationScan of stationScans) {
    if (
      getMealSessionStatus(
        stationScan.mealType,
        stationScan.date,
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
