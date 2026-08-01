import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import CafeStudent from "../models/cafeStudent.model.js";
import StationScan from "../models/stationScan.model.js";
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
import {
  getSessionCookieOptions,
  getCookieOptions,
} from "../utils/sessionSecurity.js";
import {
  buildCafeNumbers,
  filterStudentsForCafeNumber,
  getCafeDisplayName,
  normalizeBatchCafeAssignments,
  normalizeCafeCount,
} from "../utils/cafeScope.js";
import Meal from "../models/meal.model.js";
import User from "../models/user.model.js";
import PendingApproval from "../models/pendingApproval.model.js";
import TempEmailChange from "../models/TempEmailChange.model.js";
import { sendEmail } from "../utils/mailer.js";
import crypto from "crypto";
import { logInternalError, sendServerError } from "../utils/safeError.js";
// --- CAFETERIA (CAFE) USER MANAGEMENT ---
// List all cafes for the current campus
export const listCafes = async (req, res) => {
  try {
    if (!["campus", "cafe manager", "cafe"].includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const campusId = req.campus?.campusId || req.campus?.id || req.user?.campusId;
    const allUsers = await User.findAll({
      campusId,
    });
    const sortedCafes = allUsers
      .filter((u) => u.role === "cafe")
      .sort((a, b) => a.id - b.id);
    const campusStudents = await CafeStudent.findAll({ campusId });
    const cafes = await Promise.all(
      sortedCafes.map(async (cafe, index) => {
        const cafeNumber = index + 1;
        const isLive = isCampusLiveNow(cafe);

        // Clear stale isOnline flag in DB (same logic as getCampuses)
        if (!isLive && cafe.isOnline) {
          await User.updateById(cafe.id, {
            isOnline: false,
            lastActiveAt: null,
          });
        }

        const effectiveCafe =
          !isLive && cafe.isOnline
            ? { ...cafe, isOnline: false, lastActiveAt: null }
            : cafe;

        return {
          ...effectiveCafe,
          cafeNumber,
          studentCount: filterStudentsForCafeNumber(
            campusStudents,
            req.campus,
            cafeNumber,
          ).length,
        };
      }),
    );
    res.json({ cafes, tickers: [] });
  } catch (err) {
    logInternalError("list-cafes", err);
    sendServerError(res, "Could not fetch cafes");
  }
};

// Create a new cafe user for this campus
export const createCafe = async (req, res) => {
  try {
    if (!["campus", "cafe manager"].includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { name, email, username, password, displayName, campusPassword } =
      req.body;
    if (req.userRole === "campus") {
      if (!campusPassword) {
        return res
          .status(400)
          .json({ message: "Campus password is required." });
      }
      const isCampusPasswordValid = await User.comparePassword(
        req.userId,
        campusPassword,
      );
      if (!isCampusPasswordValid) {
        return res.status(401).json({ message: "Invalid campus password." });
      }
    }
    const cafeUsername = String(username || email || "")
      .toLowerCase()
      .trim();
    const campusId = req.campus?.campusId || req.user?.campusId;

    if (!name || !cafeUsername || !password) {
      return res
        .status(400)
        .json({ message: "Cafe name, username, and password are required." });
    }
    if (/\s/.test(cafeUsername)) {
      return res
        .status(400)
        .json({ message: "Username cannot contain spaces." });
    }
    const existingCafe = await User.findOne({
      name: cafeUsername,
      role: "cafe",
    });
    if (existingCafe) {
      return res
        .status(400)
        .json({ message: "A cafe with this username already exists." });
    }

    if (req.userRole === "cafe manager") {
      const pendingData = {
        name: cafeUsername,
        password,
        displayName: displayName ? displayName.trim() : null,
        campusId,
      };
      await PendingApproval.create({
        requesterId: req.userId,
        approverRole: "campus",
        requestType: "create_cafe",
        pendingData,
      });
      return res.status(202).json({
        message:
          "Cafe creation request submitted successfully! Awaiting Campus approval.",
      });
    }

    const cafe = await User.create({
      name: cafeUsername,
      email: null,
      password,
      role: "cafe",
      campusId,
      displayName: displayName ? displayName.trim() : null,
      createdBy: req.userId,
      mustChangePassword: false,
    });
    res.status(201).json({ cafe });
  } catch (err) {
    logInternalError("create-cafe", err);
    sendServerError(res, "Could not create cafe");
  }
};

// Update a cafe user (only by owning campus)
export const updateCafe = async (req, res) => {
  try {
    if (!["campus", "cafe manager"].includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const cafe = await User.findById(id);
    const campusId = req.campus?.campusId || req.user?.campusId;
    if (!cafe || cafe.role !== "cafe" || cafe.campusId !== campusId) {
      return res.status(404).json({ message: "Cafe not found" });
    }
    const { name, email, username, password, displayName, campusPassword } =
      req.body;
    if (req.userRole === "campus") {
      if (!campusPassword) {
        return res
          .status(400)
          .json({ message: "Campus password is required." });
      }
      const isCampusPasswordValid = await User.comparePassword(
        req.userId,
        campusPassword,
      );
      if (!isCampusPasswordValid) {
        return res.status(401).json({ message: "Invalid campus password." });
      }
    }
    const cafeUsername = String(username || email || name || "")
      .toLowerCase()
      .trim();
    const updateData = {};
    if (cafeUsername) {
      if (/\s/.test(cafeUsername)) {
        return res
          .status(400)
          .json({ message: "Username cannot contain spaces." });
      }
      updateData.name = cafeUsername;
      updateData.email = null;
    }
    if (displayName !== undefined) {
      updateData.displayName = displayName ? displayName.trim() : null;
    }
    if (password) {
      updateData.password = password;
      updateData.mustChangePassword = false;
    }

    if (req.userRole === "cafe manager") {
      const pendingData = {
        cafeId: id,
        cafeName: cafe.displayName || cafe.name,
        ...updateData,
      };
      await PendingApproval.create({
        requesterId: req.userId,
        approverRole: "campus",
        requestType: "update_cafe",
        pendingData,
      });
      return res.status(202).json({
        message:
          "Cafe update request submitted successfully! Awaiting Campus approval.",
      });
    }

    const updated = await User.updateById(id, updateData);
    res.json({ cafe: updated });
  } catch (err) {
    logInternalError("update-cafe", err);
    sendServerError(res, "Could not update cafe");
  }
};

// Delete a cafe user (only by owning campus)
export const deleteCafe = async (req, res) => {
  try {
    if (!["campus", "cafe manager"].includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const cafe = await User.findById(id);
    const campusId = req.campus?.campusId || req.user?.campusId;
    if (!cafe || cafe.role !== "cafe" || cafe.campusId !== campusId) {
      return res.status(404).json({ message: "Cafe not found" });
    }
    const { campusPassword } = req.body;
    if (req.userRole === "campus") {
      if (!campusPassword) {
        return res
          .status(400)
          .json({ message: "Campus password is required." });
      }
      const isCampusPasswordValid = await User.comparePassword(
        req.userId,
        campusPassword,
      );
      if (!isCampusPasswordValid) {
        return res.status(401).json({ message: "Invalid campus password." });
      }
    }

    if (req.userRole === "cafe manager") {
      const pendingData = {
        cafeId: id,
        cafeName: cafe.displayName || cafe.name,
      };
      await PendingApproval.create({
        requesterId: req.userId,
        approverRole: "campus",
        requestType: "delete_cafe",
        pendingData,
      });
      return res.status(202).json({
        message:
          "Cafe deletion request submitted successfully! Awaiting Campus approval.",
      });
    }

    await User.deleteById(id);
    res.json({ success: true });
  } catch (err) {
    logInternalError("delete-cafe", err);
    sendServerError(res, "Could not delete cafe");
  }
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const getAppliedWindowDate = (dayString, timeValue) => {
  if (!dayString || typeof timeValue !== "string") {
    return null;
  }

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
  const admins = await User.findAll(
    { role: "admin" },
    { includePassword: true },
  );
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
  const campus = await User.findById(id, { includePassword });
  if (
    !campus ||
    campus.role !== "campus" ||
    Number(campus.createdBy) !== Number(createdBy)
  ) {
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

    const { campusId, name, email, password, location, cafeCount } = req.body;
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

    const existingCampus = await User.findOne({
      createdBy: req.userId,
      nameInsensitive: name.trim(),
      role: "campus",
    });
    if (existingCampus) {
      return res.status(400).json({
        message: "A campus with this name already exists",
      });
    }

    const existingCampusId = await User.findOne({
      campusId: parsedCampusId,
      role: "campus",
    });
    if (existingCampusId) {
      return res.status(400).json({
        message: "This campus ID is already in use.",
      });
    }

    const existingCampusEmail = await User.findOne({
      email: normalizedEmail,
      role: "campus",
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

    const campus = await User.create({
      campusId: parsedCampusId,
      name: formatFullName(name.trim()),
      email: normalizedEmail,
      password,
      location: location ? formatFullName(location.trim()) : "",
      createdBy: req.userId,
      cafeCount: normalizeCafeCount(cafeCount),
      role: "campus",
      mustChangePassword: true,
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

    const campuses = (
      await User.findAll({ createdBy: req.userId, role: "campus" })
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const campusesWithStats = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await CafeStudent.countDocuments(
          getStudentCampusSyncQuery(campus),
        );
        const mealSchedule = await getMealSchedule(campus.id);
        const now = new Date();
        const { mealType, label, targetDate } = await getDashboardMealContext(
          campus.id,
          now,
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
          await User.updateById(campus.id, {
            isOnline: false,
            lastActiveAt: null,
            activeCafeNumber: null,
          });
        }

        const brandedCampus = await attachAdminLogoToCampus(effectiveCampus);
        const activeCafeNumber = Number(effectiveCampus.activeCafeNumber);
        const hasActiveCafe =
          Number.isInteger(activeCafeNumber) && activeCafeNumber > 0;

        const campusUsers = await User.findAll({
          campusId: campus.campusId || campus.id,
        });
        const sortedCafes = campusUsers
          .filter((u) => u.role === "cafe")
          .sort((a, b) => a.id - b.id);
        const cafeCount = sortedCafes.length;
        const cafeManagerCount = campusUsers.filter(
          (u) => u.role === "cafe manager",
        ).length;
        const cafes = sortedCafes.map((cafe, index) => ({
          id: cafe.id,
          cafeNumber: index + 1,
          name: cafe.name,
          displayName: cafe.displayName || cafe.name,
        }));

        let liveCafeSessions = [];
        if (isLive && hasActiveCafe) {
          const activeMeal = await Meal.findOne({
            campus: campus.id,
            cafeNumber: activeCafeNumber,
            mealType,
            date: getDayString(activityDate),
          });

          liveCafeSessions = [
            {
              cafeNumber: activeCafeNumber,
              displayName: getCafeDisplayName(
                brandedCampus.name,
                activeCafeNumber,
              ),
              openingTime: activeMeal?.appliedWindow?.actualOpenedAt || null,
              currentSessionLabel: label,
              currentSessionAppliedWindow:
                getMealWindowLabel(mealSchedule?.[mealType]) ||
                activeMeal?.appliedWindow?.label,
            },
          ];
        }

        return {
          ...brandedCampus,
          cafes,
          cafeCount,
          cafeNumbers: buildCafeNumbers(cafeCount),
          cafeManagerCount,
          name: brandedCampus.name ? formatFullName(brandedCampus.name) : "",
          location: brandedCampus.location
            ? formatFullName(brandedCampus.location)
            : "N/A",
          students: studentsCount,
          isLive,
          currentSessionLabel: label, // This is the general meal label for the time context
          currentSessionAppliedWindow:
            getMealWindowLabel(mealSchedule?.[mealType]) ||
            currentMeal?.appliedWindow?.label, // This is for the main campus entry, if no live sessions
          openingTime: actualOpenedAt, // This is for the main campus entry, if no live sessions
          closingTime: actualClosedAt, // This is for the main campus entry, if no live sessions
          liveCafeSessions,
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

    const { campusId, name, email, password, location, cafeCount } = req.body;
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
      const existingCampusId = await User.findOne({
        campusId: parsedCampusId,
        excludeId: req.params.id,
        role: "campus",
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
      const existingCampus = await User.findOne({
        createdBy: req.userId,
        nameInsensitive: name.trim(),
        excludeId: req.params.id,
        role: "campus",
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
    if (cafeCount !== undefined) {
      updates.cafeCount = normalizeCafeCount(cafeCount);
      updates.batchCafeAssignments = normalizeBatchCafeAssignments(
        campus.batchCafeAssignments || {},
        updates.cafeCount,
      );
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }
      updates.password = password;
      updates.mustChangePassword = true;
    }

    const updatedCampus = await User.updateById(campus.id, updates);
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
      const existingCampus = await User.findOne({
        createdBy: req.userId,
        nameInsensitive: name.trim(),
        excludeId: req.params.id,
        role: "campus",
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
      updates.mustChangePassword = false;
    }

    const updatedCampus = await User.updateById(campus.id, updates);

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

    const campus = await User.findById(id);
    if (!campus || campus.role !== "campus")
      return res.status(404).json({ message: "Campus not found" });

    await StationScan.deleteMany({ campus: campus.id });
    await CafeStudent.deleteMany(getStudentCampusSyncQuery(campus));

    await User.deleteById(id);
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
        cafeCount: normalizeCafeCount(brandedCampus.cafeCount),
        cafeNumbers: buildCafeNumbers(brandedCampus.cafeCount),
        selectedCafeNumber: req.cafeNumber || null,
        cafeDisplayName: getCafeDisplayName(brandedCampus.name, req.cafeNumber),
        mustChangePassword: !!brandedCampus.mustChangePassword,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch campus info" });
  }
};

export const heartbeatCampus = async (req, res) => {
  try {
    const now = new Date();
    // 1. Update the actual logged-in user (can be campus or cafe)
    if (req.userId) {
      const userUpdates = {
        isOnline: true,
        lastActiveAt: now,
      };
      if (req.cafeNumber) {
        userUpdates.activeCafeNumber = req.cafeNumber;
      }
      await User.updateById(req.userId, userUpdates);
    }

    // 2. Also update the parent campus if the logged-in user is a cafe
    if (req.campus?.id && Number(req.campus.id) !== Number(req.userId)) {
      await User.updateById(req.campus.id, {
        isOnline: true,
        lastActiveAt: now,
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

    const campus = await User.findById(campusId, { includePassword: true });
    if (!campus || campus.role !== "campus")
      return res.status(404).json({ message: "Campus not found" });

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

      await User.updateById(campus.id, { loginAttempts, lockUntil });

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - loginAttempts);
      return res.status(401).json({
        message:
          attemptsLeft > 0
            ? `Wrong password. ${attemptsLeft} attempt(s) left.`
            : `Too many attempts. Try again in ${Math.ceil(WINDOW_MS / 60000)} minute(s).`,
      });
    }

    await User.updateById(campus.id, { loginAttempts: 0, lockUntil: null });
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
    const campus = await User.findById(req.campus.id, {
      includePassword: true,
    });
    if (!campus || campus.role !== "campus") {
      return res.status(404).json({ message: "Campus not found" });
    }

    const updates = {};

    if (name && name.trim().toLowerCase() !== campus.name.toLowerCase()) {
      return res.status(400).json({
        message: "Campus name can only be modified by the administrator.",
      });
    }

    if (email && email.trim().toLowerCase() !== campus.email.toLowerCase()) {
      return res.status(400).json({
        message: "Email must be changed via the OTP verification flow.",
      });
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
      updates.mustChangePassword = false;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No updates were provided." });
    }

    const updatedCampus = await User.updateById(campus.id, updates);
    const brandedCampus = await attachAdminLogoToCampus(updatedCampus);

    res.json({
      message: "Profile updated successfully!",
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

const signCampusToken = (campusId, cafeNumber) =>
  jwt.sign(
    { id: campusId, role: "campus", cafeNumber: Number(cafeNumber) },
    process.env.JWT_SECRET,
  );

export const selectCampusCafeNumber = async (req, res) => {
  try {
    const { cafeNumber } = req.body;
    const normalizedCafeNumber = Number(cafeNumber);
    const availableCafeNumbers = buildCafeNumbers(req.campus?.cafeCount);

    if (!availableCafeNumbers.includes(normalizedCafeNumber)) {
      return res.status(400).json({
        message: "Please choose a valid cafe number for this campus.",
      });
    }

    if (req.cafeNumber && req.cafeNumber !== normalizedCafeNumber) {
      const now = new Date();
      const todayString = getDayString(now);
      const currentMealType = await getCurrentMealType(
        req.campus.id,
        now,
      ).catch(() => null);

      if (currentMealType) {
        const prevMeal = await Meal.findOne({
          campus: req.campus.id,
          cafeNumber: req.cafeNumber,
          mealType: currentMealType,
          date: todayString,
        }).catch(() => null);

        if (prevMeal) {
          await closeMealAtAppliedTime(
            prevMeal,
            req.campus.lastActiveAt,
            now,
          ).catch(() => null);
        }
      }
    }

    await User.updateById(req.campus.id, {
      activeCafeNumber: normalizedCafeNumber,
      isOnline: true,
      lastActiveAt: new Date(),
    });

    res
      .cookie(
        "campusToken",
        signCampusToken(req.campus.id, normalizedCafeNumber),
        getSessionCookieOptions(),
      )
      .json({
        message: "Cafe number selected successfully.",
        selectedCafeNumber: normalizedCafeNumber,
        cafeDisplayName: getCafeDisplayName(
          req.campus.name,
          normalizedCafeNumber,
        ),
      });
  } catch (err) {
    logInternalError("select-campus-cafe-number", err);
    sendServerError(
      res,
      "We could not save the cafe number right now. Please try again.",
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

    const todaysMeals = await Meal.findAll({
      campus: campusId,
      date: todayString,
    }).catch(() => []);

    const openMeals = todaysMeals.filter(
      (meal) =>
        meal.appliedWindow?.actualOpenedAt &&
        !meal.appliedWindow?.actualClosedAt,
    );

    await Promise.all(
      openMeals.map((meal) =>
        closeMealAtAppliedTime(meal, campus.lastActiveAt, logoutTime).catch(
          () => null,
        ),
      ),
    );

    await User.updateById(campusId, {
      isOnline: false,
      lastActiveAt: null,
      activeCafeNumber: null,
    }).catch(() => null);
  }

  res
    .clearCookie("campusToken", getSessionCookieOptions())
    .clearCookie("accessToken", getSessionCookieOptions())
    .json({ message: "Logged out" });
};

// --- CAFE MANAGER USER MANAGEMENT ---
// List all cafe managers for the current campus
export const listCafeManagers = async (req, res) => {
  try {
    if (req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }
    const campusId = req.campus?.campusId || req.user?.campusId;
    const campusCafeCount = req.campus?.cafeCount || 1;
    const allUsers = await User.findAll({
      campusId,
    });
    const cafeManagers = await Promise.all(
      allUsers
        .filter((u) => u.role === "cafe manager")
        .map(async (manager) => {
          const isLive = isCampusLiveNow(manager);

          // Clear stale isOnline flag in DB
          if (!isLive && manager.isOnline) {
            await User.updateById(manager.id, {
              isOnline: false,
              lastActiveAt: null,
            });
          }

          const effectiveManager =
            !isLive && manager.isOnline
              ? { ...manager, isOnline: false, lastActiveAt: null }
              : manager;

          return {
            ...effectiveManager,
            cafeCount: campusCafeCount,
          };
        }),
    );
    res.json({ cafeManagers });
  } catch (err) {
    logInternalError("list-cafe-managers", err);
    sendServerError(res, "Could not fetch cafe managers");
  }
};

// Create a new cafe manager
export const createCafeManager = async (req, res) => {
  try {
    if (req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { name, email, password, campusPassword } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();
    const campusId = req.campus?.campusId || req.user?.campusId;

    if (!name || !normalizedEmail || !password || !campusPassword) {
      return res.status(400).json({
        message: "Name, email, password, and campus password are required.",
      });
    }

    const isCampusPasswordValid = await User.comparePassword(
      req.userId,
      campusPassword,
    );
    if (!isCampusPasswordValid) {
      return res.status(401).json({ message: "Invalid campus password." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "A user with this email already exists." });
    }

    const pendingData = {
      name: name.trim(),
      email: normalizedEmail,
      password,
      campusId,
    };

    await PendingApproval.create({
      requesterId: req.userId,
      approverRole: "admin",
      requestType: "create_cafe_manager",
      pendingData,
    });

    res.status(202).json({
      message:
        "Cafe manager creation request submitted successfully! Awaiting Admin approval.",
    });
  } catch (err) {
    logInternalError("create-cafe-manager", err);
    sendServerError(res, "Could not create cafe manager request");
  }
};

// Update a cafe manager
export const updateCafeManager = async (req, res) => {
  try {
    if (req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const cafeManager = await User.findById(id);
    const campusId = req.campus?.campusId || req.user?.campusId;
    if (
      !cafeManager ||
      cafeManager.role !== "cafe manager" ||
      cafeManager.campusId !== campusId
    ) {
      return res.status(404).json({ message: "Cafe manager not found" });
    }
    const { name, email, password, campusPassword } = req.body;
    if (!campusPassword) {
      return res.status(400).json({ message: "Campus password is required." });
    }

    const isCampusPasswordValid = await User.comparePassword(
      req.userId,
      campusPassword,
    );
    if (!isCampusPasswordValid) {
      return res.status(401).json({ message: "Invalid campus password." });
    }
    const updateData = {};
    if (name) {
      updateData.name = name.trim();
    }
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      const existingUser = await User.findOne({
        email: normalizedEmail,
        excludeId: id,
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "A user with this email already exists." });
      }
      updateData.email = normalizedEmail;
    }
    if (password) {
      updateData.password = password;
      updateData.mustChangePassword = true;
    }

    const pendingData = {
      managerId: id,
      managerName: cafeManager.name,
      ...updateData,
    };

    await PendingApproval.create({
      requesterId: req.userId,
      approverRole: "admin",
      requestType: "update_cafe_manager",
      pendingData,
    });

    res.status(202).json({
      message:
        "Cafe manager update request submitted successfully! Awaiting Admin approval.",
    });
  } catch (err) {
    logInternalError("update-cafe-manager", err);
    sendServerError(res, "Could not update cafe manager request");
  }
};

// Delete a cafe manager
export const deleteCafeManager = async (req, res) => {
  try {
    if (req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const cafeManager = await User.findById(id);
    const campusId = req.campus?.campusId || req.user?.campusId;
    if (
      !cafeManager ||
      cafeManager.role !== "cafe manager" ||
      cafeManager.campusId !== campusId
    ) {
      return res.status(404).json({ message: "Cafe manager not found" });
    }
    const { campusPassword } = req.body;
    if (!campusPassword) {
      return res.status(400).json({ message: "Campus password is required." });
    }

    const isCampusPasswordValid = await User.comparePassword(
      req.userId,
      campusPassword,
    );
    if (!isCampusPasswordValid) {
      return res.status(401).json({ message: "Invalid campus password." });
    }

    const pendingData = {
      managerId: id,
      managerName: cafeManager.name,
    };

    await PendingApproval.create({
      requesterId: req.userId,
      approverRole: "admin",
      requestType: "delete_cafe_manager",
      pendingData,
    });

    res.status(202).json({
      success: true,
      message:
        "Cafe manager deletion request submitted successfully! Awaiting Admin approval.",
    });
  } catch (err) {
    logInternalError("delete-cafe-manager", err);
    sendServerError(res, "Could not delete cafe manager request");
  }
};

export const requestCampusEmailOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ message: "New email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const campus = await User.findById(req.userId);
    if (!campus) return res.status(404).json({ message: "Campus not found." });

    if (newEmail.toLowerCase() === campus.email.toLowerCase()) {
      return res.status(400).json({
        message: "New email cannot be the same as your current email.",
      });
    }

    const emailUsedByAdmin = await User.findOne({
      email: newEmail.toLowerCase(),
      role: "admin",
    });
    if (emailUsedByAdmin) {
      return res
        .status(409)
        .json({ message: "Email already in use by an admin." });
    }

    const emailUsedByCampus = await User.findOne({
      email: newEmail.toLowerCase(),
      excludeId: campus.id,
      role: "campus",
    });
    if (emailUsedByCampus) {
      return res
        .status(409)
        .json({ message: "Email already in use by another campus." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    await TempEmailChange.upsertByUserId(campus.id, {
      userId: campus.id,
      newEmail: newEmail.toLowerCase(),
      otp: hashedOtp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });

    await sendEmail({
      toEmail: newEmail,
      toName: formatFullName(campus.name) || "Campus",
      subject: "Confirm Your New Email",
      htmlContent: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; text-align: center;">
    <h1 style="color: #1a73e8; font-size: 26px; margin-bottom: 10px;">Hello,</h1>
    <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
      Please confirm your new email by entering the OTP below:
    </p>
    <div style="display: inline-block; padding: 15px 25px; font-size: 24px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #1a73e8, #4285f4); border-radius: 8px; letter-spacing: 2px; margin-bottom: 20px;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #999; margin-bottom: 30px;">
      This OTP will expire in 10 minutes.
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="font-size: 12px; color: #bbb;">
      If you did not request this, please ignore this email.
    </p>
    <p style="font-size: 12px; color: #bbb;">
      &copy; ${new Date().getFullYear()} GibiGebeta. All rights reserved.
    </p>
  </div>
  `,
    });

    const otpToken = jwt.sign({ userId: campus.id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.cookie("emailOtpToken", otpToken, getCookieOptions(10 * 60 * 1000));

    res.json({ message: "OTP sent to new email address." });
  } catch (error) {
    logInternalError("request-campus-email-change-otp", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

export const verifyCampusEmailOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.emailOtpToken;

    if (!token) {
      return res.status(400).json({ message: "OTP session expired." });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);

    const record = await TempEmailChange.findOne({ userId });
    if (!record) {
      return res.status(400).json({ message: "OTP request not found." });
    }

    if (new Date(record.otpExpires) < new Date()) {
      return res.status(400).json({ message: "OTP expired." });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== record.otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const campus = await User.findById(req.userId);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found." });
    }

    await User.updateById(campus.id, { email: record.newEmail });
    await TempEmailChange.deleteById(record.id);
    res.clearCookie("emailOtpToken");

    res.json({
      message: "Your email has been updated successfully.",
    });
  } catch (error) {
    logInternalError("verify-campus-email-otp", error);
    res.status(500).json({ message: "Email verification failed." });
  }
};
