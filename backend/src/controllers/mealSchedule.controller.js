import MealSchedule from "../models/mealSchedule.model.js";
import MealScheduleHistory from "../models/mealScheduleHistory.model.js";
import {
  DEFAULT_MEAL_SCHEDULE,
  ensureMealScheduleHistory,
  formatMealScheduleForResponse,
  validateMealScheduleInput,
} from "../utils/mealSession.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

const getLegacyScheduleKey = (campusId) => `meal-schedule:${campusId.toString()}`;

const getOrCreateMealSchedule = async (campusId) => {
  let schedule = await MealSchedule.findOne({ campusId });

  if (!schedule) {
    const legacySchedule = await MealSchedule.findOne({
      $or: [{ key: "default" }, { campusId: { $exists: false } }, { campusId: null }],
    });

    if (legacySchedule) {
      legacySchedule.campusId = campusId;
      legacySchedule.key = getLegacyScheduleKey(campusId);
      legacySchedule.breakfast =
        legacySchedule.breakfast || DEFAULT_MEAL_SCHEDULE.breakfast;
      legacySchedule.lunch = legacySchedule.lunch || DEFAULT_MEAL_SCHEDULE.lunch;
      legacySchedule.dinner =
        legacySchedule.dinner || DEFAULT_MEAL_SCHEDULE.dinner;
      schedule = await legacySchedule.save();
    } else {
      try {
        schedule = await MealSchedule.create({
          key: getLegacyScheduleKey(campusId),
          campusId,
          ...DEFAULT_MEAL_SCHEDULE,
        });
      } catch (err) {
        if (err?.code !== 11000) {
          throw err;
        }

        schedule = await MealSchedule.findOne({ campusId });
        if (!schedule) {
          throw err;
        }
      }
    }
  }

  if (!schedule.key) {
    schedule.key = getLegacyScheduleKey(campusId);
    schedule = await schedule.save();
  }

  await ensureMealScheduleHistory(
    campusId,
    schedule.toObject(),
    schedule.createdAt || new Date(),
  );
  return schedule;
};

export const getMealSchedule = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId } = req.params;
    if (!campusId) {
      return res.status(400).json({ message: "Campus ID is required" });
    }

    const schedule = await getOrCreateMealSchedule(campusId);

    res.json({
      schedule: formatMealScheduleForResponse(schedule.toObject()),
    });
  } catch (err) {
    logInternalError("get-meal-schedule", err);
    sendServerError(
      res,
      "We could not load the meal schedule right now. Please try again.",
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

    const existingSchedule = await getOrCreateMealSchedule(campusId);
    const hasChanged =
      existingSchedule.breakfast.start !== req.body.breakfast.start ||
      existingSchedule.breakfast.end !== req.body.breakfast.end ||
      existingSchedule.lunch.start !== req.body.lunch.start ||
      existingSchedule.lunch.end !== req.body.lunch.end ||
      existingSchedule.dinner.start !== req.body.dinner.start ||
      existingSchedule.dinner.end !== req.body.dinner.end;

    existingSchedule.breakfast = req.body.breakfast;
    existingSchedule.lunch = req.body.lunch;
    existingSchedule.dinner = req.body.dinner;
    const schedule = await existingSchedule.save();

    if (hasChanged) {
      await MealScheduleHistory.create({
        campusId,
        effectiveFrom: new Date(),
        breakfast: req.body.breakfast,
        lunch: req.body.lunch,
        dinner: req.body.dinner,
      });
    }

    res.json({
      message: "Meal schedule updated successfully.",
      schedule: formatMealScheduleForResponse(schedule.toObject()),
    });
  } catch (err) {
    logInternalError("update-meal-schedule", err);
    if (err?.code === 11000) {
      return res.status(409).json({
        message:
          "A meal schedule already exists for this campus. Please refresh and try again.",
      });
    }
    sendServerError(
      res,
      "We could not update the meal schedule right now. Please try again.",
    );
  }
};

export const getCampusMealSchedule = async (req, res) => {
  try {
    const campusId = req.campus._id;
    const schedule = await getOrCreateMealSchedule(campusId);

    res.json({
      schedule: formatMealScheduleForResponse(schedule.toObject()),
    });
  } catch (err) {
    logInternalError("get-campus-meal-schedule", err);
    sendServerError(
      res,
      "We could not load the meal schedule right now. Please try again.",
    );
  }
};
