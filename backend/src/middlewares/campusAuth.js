import jwt from "jsonwebtoken";
import Campus from "../models/campus.model.js";
import { syncCampusLiveMealWindow } from "../utils/mealSession.js";
import { buildCafeNumbers, normalizeCafeCount } from "../utils/cafeScope.js";

const ACTIVE_TOUCH_WINDOW_MS = 60 * 1000;

export const protectCampus = async (req, res, next) => {
  const token = req.cookies.campusToken;
  if (!token) return res.status(401).json({ message: "Please log in" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const campus = await Campus.findById(decoded.id);
    if (!campus) return res.status(401).json({ message: "Unauthorized" });

    const now = new Date();
    const previousLastActiveAt = campus.lastActiveAt;
    const shouldRefreshActivity =
      campus.isOnline !== true ||
      !campus.lastActiveAt ||
      now.getTime() - new Date(campus.lastActiveAt).getTime() >=
        ACTIVE_TOUCH_WINDOW_MS;

    const selectedCafeNumber = Number(decoded.cafeNumber);
    const normalizedSelectedCafeNumber =
      Number.isInteger(selectedCafeNumber) && selectedCafeNumber > 0
        ? selectedCafeNumber
        : null;

    const activityUpdates = {};
    if (shouldRefreshActivity) {
      activityUpdates.isOnline = true;
      activityUpdates.lastActiveAt = now;
    }
    if (
      normalizedSelectedCafeNumber &&
      campus.activeCafeNumber !== normalizedSelectedCafeNumber
    ) {
      activityUpdates.activeCafeNumber = normalizedSelectedCafeNumber;
    }

    if (Object.keys(activityUpdates).length > 0) {
      await Campus.updateById(campus.id, activityUpdates);
      Object.assign(campus, activityUpdates);
    }

    if (normalizedSelectedCafeNumber) {
      await syncCampusLiveMealWindow(campus.id, now, {
        onlineSince: previousLastActiveAt,
        cafeNumber: normalizedSelectedCafeNumber,
      }).catch(() => null);
    }

    req.campus = {
      ...campus,
      cafeCount: normalizeCafeCount(campus.cafeCount),
      cafeNumbers: buildCafeNumbers(campus.cafeCount),
      selectedCafeNumber: normalizedSelectedCafeNumber,
    };
    req.cafeNumber = normalizedSelectedCafeNumber;
    next();
  } catch {
    return res.status(401).json({ message: "Session expired" });
  }
};

export const requireCampusCafeSelection = (req, res, next) => {
  if (req.cafeNumber) {
    return next();
  }

  return res.status(428).json({
    message: "Please choose a cafe number before continuing.",
    requireCafeSelection: true,
    cafeNumbers: req.campus?.cafeNumbers || [],
  });
};
