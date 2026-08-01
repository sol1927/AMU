import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  formatMinutes,
  getSessionCookieOptions,
  getPersistentCookieOptions,
} from "../utils/sessionSecurity.js";
import { logInternalError } from "../utils/safeError.js";
import { buildCafeNumbers } from "../utils/cafeScope.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const signCampusToken = (userId, cafeNumber = null) =>
  jwt.sign(
    cafeNumber
      ? { id: userId, role: "campus", cafeNumber: Number(cafeNumber) }
      : { id: userId, role: "campus" },
    process.env.JWT_SECRET,
  );

const getAccountModel = () => User;

const findCampusForAccount = async (account) => {
  if (!account?.campusId) return null;

  const byRecordId = await User.findById(account.campusId);
  if (byRecordId?.role === "campus") return byRecordId;

  return User.findOne({ campusId: account.campusId, role: "campus" });
};

const resetAccountLock = async (role, accountId, options = {}) => {
  const AccountModel = getAccountModel(role);
  return AccountModel.updateById(
    accountId,
    { loginAttempts: 0, lockUntil: null },
    options,
  );
};

const registerFailedLoginAttempt = async (role, account) => {
  const AccountModel = getAccountModel(role);
  const nextAttempts = Number(account.loginAttempts || 0) + 1;
  const lockUntil =
    nextAttempts >= MAX_LOGIN_ATTEMPTS
      ? Date.now() + LOGIN_LOCK_WINDOW_MS
      : null;

  await AccountModel.updateById(account.id, {
    loginAttempts: nextAttempts,
    lockUntil,
  });

  return { nextAttempts, lockUntil };
};

export const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = String(username || email || "").trim();
    const isUsernameLogin = Boolean(username) || !identifier.includes("@");

    let user = null;
    let role = null;

    if (isUsernameLogin) {
      // Cafe login by username.
      user =
        (await User.findOne(
          { nameExact: identifier },
          { includePassword: true },
        )) ||
        (await User.findOne(
          { email: identifier.toLowerCase() },
          { includePassword: true },
        ));
      role = user?.role;
      if (role !== "cafe") {
        return res
          .status(401)
          .json({ message: "Invalid username or password." });
      }
      if (!identifier || !password) {
        return res
          .status(400)
          .json({ message: "Please enter both your username and password." });
      }
    } else if (email) {
      // Admin, campus, cafe manager login by email
      user = await User.findOne({ email }, { includePassword: true });
      role = user?.role;
      if (!user || !["admin", "campus", "cafe manager"].includes(role)) {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Please enter both your email and password." });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Please provide login credentials." });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const now = Date.now();
    if (user.lockUntil && Number(user.lockUntil) > now) {
      return res.status(429).json({
        message: `Too many attempts. Try again after ${formatMinutes(Number(user.lockUntil) - now)}.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await registerFailedLoginAttempt(role, user);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    user = await resetAccountLock(role, user.id, { includePassword: true });

    if (role === "cafe" && user.mustChangePassword) {
      user = await User.updateById(
        user.id,
        { mustChangePassword: false },
        { includePassword: true },
      );
    }

    const token =
      role === "campus"
        ? signCampusToken(user.id)
        : jwt.sign({ id: user.id, role }, process.env.JWT_SECRET);

    const cookieName = role === "campus" ? "campusToken" : "accessToken";
    // Cafe operators get a 30-day persistent cookie so they stay logged in
    // across browser closes and device restarts (needed for offline-first scanning).
    // All other roles keep the default session cookie (expires on browser close).
    const cookieOptions =
      role === "cafe" ? getPersistentCookieOptions() : getSessionCookieOptions();
    res.cookie(cookieName, token, cookieOptions);

    if (["campus", "cafe", "cafe manager"].includes(role)) {
      const loginTime = new Date();
      let activeCafeNumber = user.activeCafeNumber || null;
      let cafeNumbers = [];

      if (["cafe", "cafe manager"].includes(role)) {
        const campus = await findCampusForAccount(user);
        cafeNumbers = buildCafeNumbers(campus?.cafeCount);
        if (role === "cafe") {
          const campusId = user.campusId;
          const allCafes = await User.findAll({ campusId, role: "cafe" });
          const sortedCafes = allCafes.sort((a, b) => a.id - b.id);
          const index = sortedCafes.findIndex((c) => c.id === user.id);
          activeCafeNumber = index !== -1 ? index + 1 : null;
        }
        if (!Number.isInteger(activeCafeNumber) || activeCafeNumber < 1) {
          activeCafeNumber = cafeNumbers[0] || 1;
        }
      }

      user = await User.updateById(user.id, {
        isOnline: true,
        lastActiveAt: loginTime,
        activeCafeNumber: role === "campus" ? null : activeCafeNumber,
      });

      if (role === "campus") {
        const admin = user.createdBy
          ? await User.findById(user.createdBy)
          : null;
        if (admin?.logo) {
          user = { ...user, logo: admin.logo };
        }
        user = {
          ...user,
          selectedCafeNumber: null,
          cafeNumbers: buildCafeNumbers(user.cafeCount),
        };
      } else if (["cafe", "cafe manager"].includes(role)) {
        user = {
          ...user,
          selectedCafeNumber: activeCafeNumber,
          activeCafeNumber,
          cafeNumbers,
        };
      }
    }

    delete user.password;

    res.json({
      message: `Successfully logged in as ${role}`,
      user,
      role,
    });
  } catch (error) {
    logInternalError("login", error);
    if (
      error?.code === "EMAIL_NETWORK_ERROR" ||
      error?.code === "EMAIL_DELIVERY_FAILED"
    ) {
      return res.status(503).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.accessToken || req.cookies.campusToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          await User.updateById(decoded.id, {
            isOnline: false,
            lastActiveAt: null,
            activeCafeNumber: null,
          });
        }
      } catch {
        // Ignore token verification errors on logout
      }
    }
  } catch (err) {
    logInternalError("logout-status-clear", err);
  }

  const options = {
    ...getSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
  res
    .cookie("accessToken", "", options)
    .cookie("campusToken", "", options)
    .cookie("otpToken", "", options)
    .cookie("registerToken", "", options)
    .cookie("emailOtpToken", "", options)
    .cookie("deviceOtpToken", "", options)
    .json({ message: "Logged out" });
};

// Select active cafe station number
export const selectCafeNumber = async (req, res) => {
  try {
    const { cafeNumber } = req.body;
    const normalizedCafeNumber = Number(cafeNumber);
    await User.updateById(req.userId, {
      activeCafeNumber: normalizedCafeNumber,
    });
    res.json({ success: true, selectedCafeNumber: normalizedCafeNumber });
  } catch (err) {
    logInternalError("select-cafe-number", err);
    res.status(500).json({ message: "Could not select cafe number" });
  }
};
