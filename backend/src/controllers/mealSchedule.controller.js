import MealSchedule from "../models/mealSchedule.model.js";
import {
  DEFAULT_MEAL_SCHEDULE,
  formatMealScheduleForResponse,
  validateMealScheduleInput,
} from "../utils/mealSession.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

const DEFAULT_KEY = "default";

const getOrCreateMealSchedule = async () => {
  let schedule = await MealSchedule.findOne({ key: DEFAULT_KEY });

  if (!schedule) {
    schedule = await MealSchedule.create({
      key: DEFAULT_KEY,
      ...DEFAULT_MEAL_SCHEDULE,
    });
  }

  return schedule;
};

export const getMealSchedule = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const schedule = await getOrCreateMealSchedule();

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

    const validationError = validateMealScheduleInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const schedule = await MealSchedule.findOneAndUpdate(
      { key: DEFAULT_KEY },
      {
        key: DEFAULT_KEY,
        breakfast: req.body.breakfast,
        lunch: req.body.lunch,
        dinner: req.body.dinner,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      message: "Meal schedule updated successfully.",
      schedule: formatMealScheduleForResponse(schedule.toObject()),
    });
  } catch (err) {
    logInternalError("update-meal-schedule", err);
    sendServerError(
      res,
      "We could not update the meal schedule right now. Please try again.",
    );
  }
};

export const getCampusMealSchedule = async (_req, res) => {
  try {
    const schedule = await getOrCreateMealSchedule();

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
