import MealSchedule from "../models/mealSchedule.model.js";
import {
  DEFAULT_MEAL_SCHEDULE,
  formatMealScheduleForResponse,
  getMealScheduleAt,
  validateMealScheduleInput,
} from "../utils/mealSession.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

const getLegacyScheduleKey = (campusId) => `meal-schedule:${campusId.toString()}`;

const getOrCreateMealSchedule = async (campusId) => {
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
        : await getOrCreateMealSchedule(campusId);
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
    const schedule = await MealSchedule.updateById(existingSchedule.id, {
      breakfast: req.body.breakfast,
      lunch: req.body.lunch,
      dinner: req.body.dinner,
    });

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
        : await getOrCreateMealSchedule(campusId);

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

    const existingSchedule = await getOrCreateMealSchedule(campusId);
    const schedule = await MealSchedule.updateById(existingSchedule.id, {
      breakfast: req.body.breakfast,
      lunch: req.body.lunch,
      dinner: req.body.dinner,
    });

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
