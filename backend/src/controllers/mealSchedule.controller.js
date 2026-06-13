import MealSchedule from "../models/mealSchedule.model.js";
import mealSessionConfigHistory from "../models/mealSessionConfigHistory.model.js";
import MealSessionSnapshot from "../models/mealSessionSnapshot.model.js";
import {
  getAppDayString,
  getAppMinutesFromDate,
} from "../utils/appTimezone.js";
import {
  DEFAULT_MEAL_SCHEDULE,
  formatMealScheduleForResponse,
  getMealScheduleAt,
  validateMealScheduleInput,
} from "../utils/mealSession.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

const getLegacyScheduleKey = (campusId) =>
  `meal-schedule:${campusId.toString()}`;

const ensureMealScheduleHistory = async (
  campusId,
  schedule,
  createdByUserId,
) => {
  const creator = createdByUserId || campusId;
  const sessions = ["breakfast", "lunch", "dinner"];

  for (const session of sessions) {
    const latest = await mealSessionConfigHistory.findLatestConfig(
      campusId,
      session,
    );
    if (!latest) {
      const window = schedule[session] || DEFAULT_MEAL_SCHEDULE[session];
      await mealSessionConfigHistory.create({
        sessionName: session,
        startTime: window.start,
        endTime: window.end,
        appliedDate: getAppDayString(schedule.createdAt || new Date()),
        appliedTimestamp: schedule.createdAt || new Date(),
        campusId,
        createdBy: creator,
        version: 1,
      });
    }
  }
};

const recordScheduleChangeHistory = async (
  campusId,
  oldSchedule,
  newSchedule,
  createdByUserId,
) => {
  const creator = createdByUserId || campusId;
  const sessions = ["breakfast", "lunch", "dinner"];
  const todayYmd = getAppDayString(new Date());
  const currentMinutes = getAppMinutesFromDate(new Date());

  const parseTimeToMinutes = (timeStr) => {
    if (typeof timeStr !== "string" || !/^\d{2}:\d{2}$/.test(timeStr)) {
      return null;
    }
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  for (const session of sessions) {
    const oldWindow = oldSchedule[session] || {};
    const newWindow = newSchedule[session] || {};

    if (
      oldWindow.start !== newWindow.start ||
      oldWindow.end !== newWindow.end
    ) {
      const latest = await mealSessionConfigHistory.findLatestConfig(
        campusId,
        session,
      );
      let nextVersion;

      if (latest) {
        nextVersion = latest.version + 1;
      } else {
        await mealSessionConfigHistory.create({
          sessionName: session,
          startTime: oldWindow.start || "00:00",
          endTime: oldWindow.end || "00:00",
          appliedDate: getAppDayString(oldSchedule.updatedAt || new Date()),
          appliedTimestamp: oldSchedule.updatedAt || new Date(),
          campusId,
          createdBy: creator,
          version: 1,
        });
        nextVersion = 2;
      }

      const endMinutes = parseTimeToMinutes(oldWindow.end);
      let appliedDate = todayYmd;
      if (endMinutes !== null && currentMinutes >= endMinutes) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        appliedDate = getAppDayString(tomorrow);
      }

      await mealSessionConfigHistory.create({
        sessionName: session,
        startTime: newWindow.start,
        endTime: newWindow.end,
        appliedDate,
        appliedTimestamp: new Date(),
        campusId,
        createdBy: creator,
        version: nextVersion,
      });
    }
  }
};

const getOrCreateMealSchedule = async (campusId, createdByUserId) => {
  let schedule = await MealSchedule.findOne({ campusId });

  if (!schedule) {
    schedule = await MealSchedule.create({
      key: getLegacyScheduleKey(campusId),
      campusId,
      ...DEFAULT_MEAL_SCHEDULE,
    });
  }

  if (!schedule.key) {
    schedule = await MealSchedule.updateById(schedule.id, {
      key: getLegacyScheduleKey(campusId),
    });
  }

  await ensureMealScheduleHistory(campusId, schedule, createdByUserId);

  return schedule;
};

export const getMealSchedule = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId } = req.params;
    const { date } = req.query;
    if (!campusId) {
      return res.status(400).json({ message: "Campus ID is required" });
    }

    const hasDateFilter = typeof date === "string" && date.trim() !== "";
    const referenceDate = hasDateFilter ? new Date(`${date}T00:00:00`) : null;
    const hasValidDate =
      referenceDate && !Number.isNaN(referenceDate.getTime());

    const schedule =
      hasDateFilter && hasValidDate
        ? await getMealScheduleAt(campusId, referenceDate)
        : await getMealScheduleAt(campusId, new Date());
    res.json({
      schedule: formatMealScheduleForResponse(schedule),
    });
  } catch (err) {
    logInternalError("get-meal-schedule", err);
    sendServerError(
      res,
      "We could not load the meal schedule right now. Please try again.",
    );
  }
};

const syncActiveSnapshotsOnScheduleChange = async (campusId, newSchedule) => {
  try {
    const todayYmd = getAppDayString(new Date());
    const currentMinutes = getAppMinutesFromDate(new Date());

    const sessions = ["breakfast", "lunch", "dinner"];
    for (const session of sessions) {
      const newWindow = newSchedule[session];
      if (!newWindow) continue;

      // Find all snapshots for this campus and session today
      const snapshots = await MealSessionSnapshot.findAll({
        campusId: Number(campusId),
        date: todayYmd,
        mealSession: session,
      });

      for (const snapshot of snapshots) {
        // Parse time to minutes
        const [endHourText, endMinuteText] = snapshot.sessionEndTime.split(":");
        const endMinutes = Number(endHourText) * 60 + Number(endMinuteText);

        // While the meal session has NOT reached its end time: The snapshot remains editable and synchronized.
        if (currentMinutes < endMinutes) {
          // Update the sessionStartTime and sessionEndTime in the snapshot
          await MealSessionSnapshot.updateById(snapshot.id, {
            sessionStartTime: newWindow.start,
            sessionEndTime: newWindow.end,
          });
        } else if (snapshot.sessionStatus === "Active") {
          // Automatically close/lock the snapshot if its end time has passed
          await MealSessionSnapshot.updateById(snapshot.id, {
            sessionStatus: "Closed",
          });
        }
      }
    }
  } catch (err) {
    console.error(
      "Failed to sync active snapshots on schedule change:",
      err.message,
    );
  }
};

export const updateMealSchedule = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId } = req.params;
    if (!campusId) {
      return res.status(400).json({ message: "Campus ID is required" });
    }

    const validationError = validateMealScheduleInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingSchedule = await getOrCreateMealSchedule(
      campusId,
      req.userId,
    );
    await recordScheduleChangeHistory(
      campusId,
      existingSchedule,
      req.body,
      req.userId,
    );

    const schedule = await MealSchedule.updateById(existingSchedule.id, {
      breakfast: req.body.breakfast,
      lunch: req.body.lunch,
      dinner: req.body.dinner,
    });

    await syncActiveSnapshotsOnScheduleChange(campusId, req.body);

    res.json({
      message: "Meal schedule updated successfully.",
      schedule: formatMealScheduleForResponse(schedule),
    });
  } catch (err) {
    logInternalError("update-meal-schedule", err);
    sendServerError(
      res,
      "We could not update the meal schedule right now. Please try again.",
    );
  }
};

export const getCampusMealSchedule = async (req, res) => {
  try {
    const campusId = req.campus.id;
    const { date } = req.query;
    const hasDateFilter = typeof date === "string" && date.trim() !== "";
    const referenceDate = hasDateFilter ? new Date(`${date}T00:00:00`) : null;
    const hasValidDate =
      referenceDate && !Number.isNaN(referenceDate.getTime());

    const schedule =
      hasDateFilter && hasValidDate
        ? await getMealScheduleAt(campusId, referenceDate)
        : await getMealScheduleAt(campusId, new Date());

    res.json({
      schedule: formatMealScheduleForResponse(schedule),
    });
  } catch (err) {
    logInternalError("get-campus-meal-schedule", err);
    sendServerError(
      res,
      "We could not load the meal schedule right now. Please try again.",
    );
  }
};

export const updateCampusMealSchedule = async (req, res) => {
  try {
    const campusId = req.campus.id;

    const validationError = validateMealScheduleInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingSchedule = await getOrCreateMealSchedule(
      campusId,
      req.campus.id,
    );
    await recordScheduleChangeHistory(
      campusId,
      existingSchedule,
      req.body,
      req.campus.id,
    );

    const schedule = await MealSchedule.updateById(existingSchedule.id, {
      breakfast: req.body.breakfast,
      lunch: req.body.lunch,
      dinner: req.body.dinner,
    });

    await syncActiveSnapshotsOnScheduleChange(campusId, req.body);

    res.json({
      message: "Meal schedule updated successfully.",
      schedule: formatMealScheduleForResponse(schedule),
    });
  } catch (err) {
    logInternalError("update-campus-meal-schedule", err);
    sendServerError(
      res,
      "We could not update the meal schedule right now. Please try again.",
    );
  }
};
