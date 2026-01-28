import express from "express";
import {
  requestOTP,
  verifyOTP,
  setPassword,
  login,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  logout,
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  otpLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  loginLimiter,
} from "../middlewares/rateLimiter.js";

const router = express.Router();

// 🔐 OTP flow
router.post("/request-otp", otpLimiter, requestOTP); // limit OTP requests
router.post("/verify-otp", otpVerifyLimiter, verifyOTP); // limit OTP tries
router.post("/set-password", setPassword);

// 🔐 Login
router.post("/login", loginLimiter, login); // limit login attempts

// 👤 Auth user
router.get("/me", verifyToken, getCurrentUser);

// 🔐 Password reset
router.post(
  "/request-password-reset",
  passwordResetLimiter,
  requestPasswordReset,
);
router.post("/reset-password", resetPassword);

// 🚪 Logout
router.post("/logout", logout);

export default router;
