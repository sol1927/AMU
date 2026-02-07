import express from "express";

import { login, logout } from "../controllers/auth.controller.js";

import {
  requestOTP,
  verifyOTP,
  setPassword,
} from "../controllers/otp.controller.js";

import {
  verifyAdminDeviceOtp,
  resendDeviceOtp,
} from "../controllers/device.controller.js";

import {
  requestPasswordReset,
  resetPassword,
} from "../controllers/password.controller.js";

import {
  otpLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  loginLimiter,
  deviceOtpLimiter,
} from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/request-otp", otpLimiter, requestOTP);
router.post("/verify-otp", otpVerifyLimiter, verifyOTP);
router.post("/set-password", setPassword);
router.post("/login", loginLimiter, login);
router.post("/verify-device-otp", verifyAdminDeviceOtp);
router.post("/resend-device-otp", deviceOtpLimiter, resendDeviceOtp);
router.post(
  "/request-password-reset",
  passwordResetLimiter,
  requestPasswordReset,
);
router.post("/reset-password", resetPassword);
router.post("/logout", logout);

export default router;
