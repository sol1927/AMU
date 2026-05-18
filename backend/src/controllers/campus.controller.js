import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import CafeStudent from "../models/cafeStudent.model.js";
import StationScan from "../models/stationScan.model.js";
import Meal from "../models/meal.model.js";
import { formatFullName } from "../utils/formatName.js";
import { getStudentCampusSyncQuery, parseCampusId } from "../utils/campusId.js";
import {
  getDashboardMealContext,
  getDayString,
  getCurrentMealType,
  getMealSchedule,
  getMealWindowLabel,
  isCampusLiveNow,
} from "../utils/mealSession.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";
import { getSessionCookieOptions } from "../utils/sessionSecurity.js";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const getAppliedWindowDate = (dayString, timeValue) => {
  if (!dayString || typeof timeValue !== "string") {
    return null;
  }

  // Explicitly parse the time in the campus timezone (UTC+3 for Ethiopia)
  const date = new Date(`${dayString}T${timeValue}:00+03:00`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const clampToAppliedWindow = (value, appliedWindow, dayString) => {
  const date = value ? new Date(value) : null;
  const start = getAppliedWindowDate(dayString, appliedWindow?.start);
  const end = getAppliedWindowDate(dayString, appliedWindow?.end);

  if (!date || Number.isNaN(date.getTime())) {
    return start || null;
  }

  if (start && date < start) {
    return start;
  }

  if (end && date > end) {
    return end;
  }

  return date;
};

const closeMealAtAppliedTime = async (meal, fallbackOpenedAt, logoutTime) => {
  if (!meal?.id) {
    return;
  }

  const appliedWindow = meal.appliedWindow || {};
  const dayString = meal.date || getDayString(logoutTime);
  const openedAt = clampToAppliedWindow(
    appliedWindow.actualOpenedAt ||
      fallbackOpenedAt ||
      meal.createdAt ||
      logoutTime,
    appliedWindow,
    dayString,
  );
  const closedAt = clampToAppliedWindow(logoutTime, appliedWindow, dayString);

  await Meal.updateById(meal.id, {
    appliedWindow: {
      ...appliedWindow,
      actualOpenedAt: openedAt?.toISOString?.() || null,
      actualClosedAt: closedAt?.toISOString?.() || null,
    },
  });
};

const findAdminConflict = async ({ email, name, excludeId } = {}) => {
  const admins = await User.findAll({}, { includePassword: true });
  return (
    admins.find((admin) => {
      if (excludeId && admin.id === Number(excludeId)) return false;
      const sameEmail = email && admin.email === email;
      const sameName =
        name && admin.name && admin.name.toLowerCase() === name.toLowerCase();
      return sameEmail || sameName;
    }) || null
  );
};

const findOwnedCampus = async (id, createdBy, includePassword = false) => {
  const campus = await Campus.findById(id, { includePassword });
  if (!campus || Number(campus.createdBy) !== Number(createdBy)) {
    return null;
  }
  return campus;
};

const attachAdminLogoToCampus = async (campus) => {
  if (!campus) {
    return campus;
  }

  const admin = campus.createdBy ? await User.findById(campus.createdBy) : null;

  return {
    ...campus,
    logo: admin?.logo || campus.logo,
  };
};

export const createCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId, name, email, password, location } = req.body;
    const parsedCampusId = parseCampusId(campusId);
    const normalizedEmail = email?.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (parsedCampusId === null) {
      return res.status(400).json({
        message: "Campus ID is required and must be a positive whole number.",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters",
      });
    }

    const existingCampus = await Campus.findOne({
      createdBy: req.userId,
      nameInsensitive: name.trim(),
    });
    if (existingCampus) {
      return res.status(400).json({
        message: "A campus with this name already exists",
      });
    }

    const existingCampusId = await Campus.findOne({ campusId: parsedCampusId });
    if (existingCampusId) {
      return res.status(400).json({
        message: "This campus ID is already in use.",
      });
    }

    const existingCampusEmail = await Campus.findOne({
      email: normalizedEmail,
    });
    if (existingCampusEmail) {
      return res.status(400).json({
        message: "A campus with this email already exists.",
      });
    }

    const adminWithEmailOrName = await findAdminConflict({
      email: normalizedEmail,
      name: formatFullName(name.trim()),
    });
    if (adminWithEmailOrName) {
      return res.status(400).json({
        message: "Campus email or name cannot be the same as an admin",
      });
    }

    const campus = await Campus.create({
      campusId: parsedCampusId,
      name: formatFullName(name.trim()),
      email: normalizedEmail,
      password,
      location: location ? formatFullName(location.trim()) : "",
      createdBy: req.userId,
    });
    const brandedCampus = await attachAdminLogoToCampus(campus);

    res.status(201).json({
      message: "Campus created successfully",
      campus: brandedCampus,
    });
  } catch (err) {
    logInternalError("create-campus", err);

    if (err?.code === "ER_DUP_ENTRY") {
      if (err?.message?.includes("campuses.email")) {
        return res.status(400).json({
          message: "A campus with this email already exists.",
        });
      }

      if (err?.message?.includes("campuses.campusId")) {
        return res.status(400).json({
          message: "This campus ID is already in use.",
        });
      }
    }

    res.status(500).json({ message: "Failed to create campus" });
  }
};

export const getCampuses = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const campuses = (await Campus.findAll({ createdBy: req.userId })).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    const campusesWithStats = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await CafeStudent.countDocuments(
          getStudentCampusSyncQuery(campus),
        );
        const mealSchedule = await getMealSchedule(campus.id);
        const now = new Date();
        const addisNow = new Date(
          now.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }),
        );
        const { mealType, label, targetDate } = await getDashboardMealContext(
          campus.id,
          addisNow,
        );
        const activityDate = new Date(targetDate);
        activityDate.setHours(0, 0, 0, 0);
        const currentMeal = await Meal.findOne({
          campus: campus.id,
          mealType,
          date: getDayString(activityDate),
        });
        const actualOpenedAt =
          currentMeal?.appliedWindow?.actualOpenedAt || null;
        const actualClosedAt =
          currentMeal?.appliedWindow?.actualClosedAt || null;
        const isLive = isCampusLiveNow(campus);
        const effectiveCampus =
          !isLive && campus.isOnline
            ? { ...campus, isOnline: false, lastActiveAt: null }
            : campus;

        if (!isLive && campus.isOnline) {
          await Campus.updateById(campus.id, {
            isOnline: false,
            lastActiveAt: null,
          });
        }

        const currentSessionAppliedWindow =
          currentMeal?.appliedWindow?.label ||
          getMealWindowLabel(mealSchedule?.[mealType]);
        const brandedCampus = await attachAdminLogoToCampus(effectiveCampus);

        return {
          ...brandedCampus,
          name: brandedCampus.name ? formatFullName(brandedCampus.name) : "",
          location: brandedCampus.location
            ? formatFullName(brandedCampus.location)
            : "N/A",
          students: studentsCount,
          isLive,
          currentSessionLabel: label,
          currentSessionAppliedWindow,
          openingTime: actualOpenedAt,
          closingTime: actualClosedAt,
        };
      }),
    );

    res.json({ campuses: campusesWithStats });
  } catch (err) {
    logInternalError("fetch-campuses", err);
    sendServerError(
      res,
      "We could not load campuses right now. Please try again.",
    );
  }
};

export const updateCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campusId, name, email, password, location } = req.body;
    const campus = await findOwnedCampus(req.params.id, req.userId, true);

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const previousCampusId = campus.campusId;
    const updates = {};

    if (campusId !== undefined) {
      const parsedCampusId = parseCampusId(campusId);
      if (parsedCampusId === null) {
        return res.status(400).json({
          message: "Campus ID must be a positive whole number.",
        });
      }

      const existingCampusId = await Campus.findOne({
        campusId: parsedCampusId,
        excludeId: req.params.id,
      });
      if (existingCampusId) {
        return res.status(400).json({
          message: "This campus ID is already in use.",
        });
      }

      updates.campusId = parsedCampusId;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      updates.email = email;
    }

    if (name) {
      const existingCampus = await Campus.findOne({
        createdBy: req.userId,
        nameInsensitive: name.trim(),
        excludeId: req.params.id,
      });
      if (existingCampus) {
        return res.status(400).json({
          message: "A campus with this name already exists",
        });
      }

      updates.name = formatFullName(name.trim());
    }

    if (email || name) {
      const adminConflict = await findAdminConflict({
        email,
        name: updates.name || name,
      });
      if (adminConflict) {
        return res.status(400).json({
          message: "Campus email or name cannot be the same as an admin",
        });
      }
    }

    if (location !== undefined) {
      updates.location = location ? formatFullName(location.trim()) : "";
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }
      updates.password = password;
    }

    const updatedCampus = await Campus.updateById(campus.id, updates);
    const brandedCampus = await attachAdminLogoToCampus(updatedCampus);

    if (campusId !== undefined) {
      await CafeStudent.updateMany(
        getStudentCampusSyncQuery(campus, previousCampusId),
        { campusId: updatedCampus.campusId },
      );
    }

    res.json({
      message: "Campus updated successfully",
      campus: brandedCampus,
    });
  } catch (err) {
    logInternalError("update-campus", err);
    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const selfUpdateCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, currentPassword, location } = req.body;
    const campus = await findOwnedCampus(req.params.id, req.userId, true);

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const updates = {};

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      updates.email = email;
    }

    if (name) {
      const existingCampus = await Campus.findOne({
        createdBy: req.userId,
        nameInsensitive: name.trim(),
        excludeId: req.params.id,
      });
      if (existingCampus) {
        return res.status(400).json({
          message: "A campus with this name already exists",
        });
      }
      updates.name = formatFullName(name.trim());
    }

    if (email || name) {
      const adminConflict = await findAdminConflict({
        email,
        name: updates.name || name,
      });
      if (adminConflict) {
        return res.status(400).json({
          message: "Campus email or name cannot be the same as an admin",
        });
      }
    }

    if (location !== undefined) {
      updates.location = location ? formatFullName(location.trim()) : "";
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      const match = await bcrypt.compare(currentPassword, campus.password);
      if (!match) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const sameAsCurrent = await bcrypt.compare(password, campus.password);
      if (sameAsCurrent) {
        return res.status(400).json({
          message: "New password cannot be the same as current password",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters",
        });
      }

      updates.password = password;
    }

    const updatedCampus = await Campus.updateById(campus.id, updates);

    res.json({
      message: "Campus updated successfully",
      campus: updatedCampus,
    });
  } catch (err) {
    logInternalError("self-update-campus", err);
    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await Campus.findById(id);
    if (!campus) return res.status(404).json({ message: "Campus not found" });

    await StationScan.deleteMany({ campus: campus.id });
    await CafeStudent.deleteMany(getStudentCampusSyncQuery(campus));

    await Campus.deleteById(id);
    res.json({ message: "Campus and its students deleted successfully" });
  } catch (err) {
    logInternalError("delete-campus", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCampusDashboard = async (req, res) => {
  try {
    const campus = req.campus;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const brandedCampus = await attachAdminLogoToCampus(campus);

    res.json({
      campus: {
        campusId: brandedCampus.campusId,
        name: brandedCampus.name,
        email: brandedCampus.email,
        location: brandedCampus.location,
        logo: brandedCampus.logo,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch campus info" });
  }
};

export const heartbeatCampus = async (req, res) => {
  try {
    if (req.campus?.id) {
      await Campus.updateById(req.campus.id, {
        isOnline: true,
        lastActiveAt: new Date(),
      });
    }

    res.status(204).end();
  } catch (err) {
    logInternalError("heartbeat-campus", err);
    res.status(204).end();
  }
};

export const verifyCampusPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const campusId = req.campus.id;

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    const campus = await Campus.findById(campusId, { includePassword: true });
    if (!campus) return res.status(404).json({ message: "Campus not found" });

    const now = Date.now();

    if (campus.lockUntil && campus.lockUntil > now) {
      const remaining = campus.lockUntil - now;
      const minutesLeft = Math.ceil(remaining / 60000);
      return res.status(429).json({
        message: `Too many attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, campus.password);

    if (!isMatch) {
      const loginAttempts = Number(campus.loginAttempts || 0) + 1;
      const lockUntil = loginAttempts >= MAX_ATTEMPTS ? now + WINDOW_MS : null;

      await Campus.updateById(campus.id, { loginAttempts, lockUntil });

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - loginAttempts);
      return res.status(401).json({
        message:
          attemptsLeft > 0
            ? `Wrong password. ${attemptsLeft} attempt(s) left.`
            : `Too many attempts. Try again in ${Math.ceil(WINDOW_MS / 60000)} minute(s).`,
      });
    }

    await Campus.updateById(campus.id, { loginAttempts: 0, lockUntil: null });
    return res.status(200).json({ message: "Password correct" });
  } catch (err) {
    logInternalError("verify-campus-password", err);
    return sendServerError(
      res,
      "We could not verify the password right now. Please try again.",
    );
  }
};

export const updateCampusProfile = async (req, res) => {
  try {
    const { name, email, password, currentPassword, location } = req.body;
    const campus = await Campus.findById(req.campus.id, {
      includePassword: true,
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const updates = {};

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const existingCampus = await Campus.findOne({
        email: normalizedEmail,
        excludeId: campus.id,
      });
      if (existingCampus) {
        return res.status(400).json({
          message: "This campus email is already in use.",
        });
      }

      const adminConflict = await User.findOne({ email: normalizedEmail });
      if (adminConflict) {
        return res.status(400).json({
          message: "This email is already being used by an admin.",
        });
      }

      updates.email = normalizedEmail;
    }

    if (name) {
      const normalizedName = formatFullName(name.trim());
      const existingCampusName = await Campus.findOne({
        nameInsensitive: normalizedName,
        excludeId: campus.id,
      });

      if (existingCampusName) {
        return res.status(400).json({
          message: "A campus with this name already exists.",
        });
      }

      const adminConflict = await findAdminConflict({ name: normalizedName });
      if (adminConflict) {
        return res.status(400).json({
          message: "This name is already being used by an admin.",
        });
      }

      updates.name = normalizedName;
    }

    if (location !== undefined) {
      updates.location = location ? formatFullName(location.trim()) : "";
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password.",
        });
      }

      const match = await bcrypt.compare(currentPassword, campus.password);
      if (!match) {
        return res.status(400).json({
          message: "Current password is incorrect.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters.",
        });
      }

      const sameAsCurrent = await bcrypt.compare(password, campus.password);
      if (sameAsCurrent) {
        return res.status(400).json({
          message: "New password cannot be the same as your current password.",
        });
      }

      updates.password = password;
    }

    const updatedCampus = await Campus.updateById(campus.id, updates);
    const brandedCampus = await attachAdminLogoToCampus(updatedCampus);

    res.json({
      message: "Campus profile updated successfully.",
      campus: brandedCampus,
    });
  } catch (err) {
    logInternalError("update-campus-profile", err);
    sendServerError(
      res,
      "We could not save your campus changes right now. Please try again.",
    );
  }
};

export const logoutCampus = async (req, res) => {
  const logoutTime = new Date();
  const campus = req.campus;
  const campusId = campus?.id;

  if (campusId) {
    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
    }).format(logoutTime);

    const currentMealType = await getCurrentMealType(
      campusId,
      logoutTime,
    ).catch(() => null);

    if (currentMealType) {
      const currentMeal = await Meal.findOne({
        campus: campusId,
        mealType: currentMealType,
        date: todayString,
      }).catch(() => null);

      if (currentMeal) {
        await closeMealAtAppliedTime(
          currentMeal,
          campus.lastActiveAt,
          logoutTime,
        ).catch(() => null);
      }
    } else {
      const todaysMeals = await Meal.findAll({
        campus: campusId,
        date: todayString,
      }).catch(() => []);
      const openExpiredMeals = todaysMeals.filter((meal) => {
        const appliedWindow = meal.appliedWindow || {};
        const end = getAppliedWindowDate(todayString, appliedWindow.end);

        return (
          appliedWindow.actualOpenedAt &&
          !appliedWindow.actualClosedAt &&
          end &&
          logoutTime >= end
        );
      });

      await Promise.all(
        openExpiredMeals.map((meal) =>
          closeMealAtAppliedTime(meal, campus.lastActiveAt, logoutTime).catch(
            () => null,
          ),
        ),
      );
    }

    await Campus.updateById(campusId, {
      isOnline: false,
      lastActiveAt: null,
    }).catch(() => null);
  }

  res
    .clearCookie("campusToken", getSessionCookieOptions())
    .clearCookie("accessToken", getSessionCookieOptions())
    .json({ message: "Logged out" });
};
