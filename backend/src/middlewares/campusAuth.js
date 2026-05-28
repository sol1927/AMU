import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { syncCampusLiveMealWindow } from "../utils/mealSession.js";
import { buildCafeNumbers, normalizeCafeCount } from "../utils/cafeScope.js";

const ACTIVE_TOUCH_WINDOW_MS = 60 * 1000;

export const protectCampus = async (req, res, next) => {
  let token = req.cookies.campusToken;
  let isAccessToken = false;

  if (!token) {
    token = req.cookies.accessToken;
    isAccessToken = true;
  }

  if (!token) return res.status(401).json({ message: "Please log in" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let campus = null;
    let selectedCafeNumber = null;
    let loggedInUser = null;

    if (isAccessToken) {
      if (decoded.role !== "cafe manager") {
        return res
          .status(401)
          .json({ message: "Unauthorized role for campus access" });
      }

      loggedInUser = await User.findById(decoded.id);
      if (!loggedInUser) {
        return res.status(401).json({ message: "User not found" });
      }

      campus = await User.findById(loggedInUser.campusId);
      if (campus?.role !== "campus") {
        campus = await User.findOne({
          campusId: loggedInUser.campusId,
          role: "campus",
        });
      }
      selectedCafeNumber = loggedInUser.activeCafeNumber || null;
    } else {
      campus = await User.findById(decoded.id);
      selectedCafeNumber = Number(decoded.cafeNumber) || null;
    }

    if (!campus || campus.role !== "campus")
      return res.status(401).json({ message: "Unauthorized" });

    const now = new Date();
    const previousLastActiveAt = campus.lastActiveAt;
    const shouldRefreshActivity =
      campus.isOnline !== true ||
      !campus.lastActiveAt ||
      now.getTime() - new Date(campus.lastActiveAt).getTime() >=
        ACTIVE_TOUCH_WINDOW_MS;

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
      await User.updateById(campus.id, activityUpdates);
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

    if (isAccessToken) {
      req.user = loggedInUser;
      req.userRole = decoded.role;
      req.userId = loggedInUser.id;
    } else {
      req.user = campus;
      req.userRole = "campus";
      req.userId = campus.id;
    }
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
