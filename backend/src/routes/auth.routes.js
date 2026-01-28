import express from "express";
import {
  requestOTP,
  verifyOTP,
  setPassword,
  login,
  getCurrentUser,
  requestPasswordReset, // ✅ import the new functions
  resetPassword,
  logout, // ✅ import logout function
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/request-otp", requestOTP); // Step 1
router.post("/verify-otp", verifyOTP); // Step 2
router.post("/set-password", setPassword); // Step 3
router.post("/login", login);
router.get("/me", verifyToken, getCurrentUser); // ✅ new route
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/logout", logout); // ✅ new logout route

export default router;
