import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Campus from "../models/campus.model.js";
import { syncCampusLiveMealWindow } from "../utils/mealSession.js";
import {
  formatMinutes,
  getSessionCookieOptions,
} from "../utils/sessionSecurity.js";
import { logInternalError } from "../utils/safeError.js";
import { buildCafeNumbers } from "../utils/cafeScope.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const signCampusToken = (campusId, cafeNumber = null) =>
  jwt.sign(
    cafeNumber
      ? { id: campusId, role: "campus", cafeNumber: Number(cafeNumber) }
      : { id: campusId, role: "campus" },
    process.env.JWT_SECRET,
  );

const getAccountModel = (role) => (role === "admin" ? User : Campus);

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter both your email and password.",
      });
    }

    let user = await User.findOne(
      { email, role: "admin" },
      { includePassword: true },
    );
    let role = "admin";

    if (!user) {
      user = await Campus.findOne({ email }, { includePassword: true });
      role = "campus";
    }

    if (!user) {
      const [existingAdmin, existingCampus] = await Promise.all([
        User.findOne({ role: "admin" }),
        Campus.findOne(),
      ]);

      if (!existingAdmin && !existingCampus) {
        return res.status(404).json({
          message:
            "No admin or campus account has been set up yet. Please create the first account before signing in.",
        });
      }

      return res.status(401).json({ message: "Invalid email or password." });
    }

    const now = Date.now();
    if (user.lockUntil && Number(user.lockUntil) > now) {
      return res.status(429).json({
        message: `Too many attempts. Try again after ${formatMinutes(
          Number(user.lockUntil) - now,
        )}.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await registerFailedLoginAttempt(role, user);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    user = await resetAccountLock(role, user.id, { includePassword: true });

    if (role === "admin" && user.mustChangePassword) {
      return res.status(200).json({
        message: "This is your first login. Please set a new password.",
        requirePasswordSetup: true,
        email: user.email,
        user,
      });
    }

    const token =
      role === "campus"
        ? signCampusToken(user.id)
        : jwt.sign({ id: user.id, role }, process.env.JWT_SECRET);

    const cookieName = role === "admin" ? "accessToken" : "campusToken";
    res.cookie(cookieName, token, getSessionCookieOptions());

    if (role === "campus") {
      const loginTime = new Date();
      user = await Campus.updateById(user.id, {
        isOnline: true,
        lastActiveAt: loginTime,
      });
      const admin = user.createdBy ? await User.findById(user.createdBy) : null;
      if (admin?.logo) {
        user = { ...user, logo: admin.logo };
      }
      user = {
        ...user,
        selectedCafeNumber: null,
        cafeNumbers: buildCafeNumbers(user.cafeCount),
      };
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

export const logout = (req, res) => {
  const options = { ...getSessionCookieOptions(), maxAge: 0, expires: new Date(0) };
  res
    .cookie("accessToken", "", options)
    .cookie("campusToken", "", options)
    .cookie("otpToken", "", options)
    .cookie("registerToken", "", options)
    .cookie("emailOtpToken", "", options)
    .cookie("deviceOtpToken", "", options)
    .json({ message: "Logged out" });
};
