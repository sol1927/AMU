import jwt from "jsonwebtoken";
import Campus from "../models/campus.model.js";
import { syncCampusLiveMealWindow } from "../utils/mealSession.js";

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

    if (shouldRefreshActivity) {
      await Campus.updateById(campus.id, {
        isOnline: true,
        lastActiveAt: now,
      });

      campus.isOnline = true;
      campus.lastActiveAt = now;
    }

    await syncCampusLiveMealWindow(campus.id, now, {
      onlineSince: previousLastActiveAt,
    }).catch(() => null);

    req.campus = campus;
    next();
  } catch {
    return res.status(401).json({ message: "Session expired" });
  }
};
