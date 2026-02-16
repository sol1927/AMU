import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";
import {
  getMyProfile,
  updateProfile,
  changePassword,
  updateProfilePhoto,
  requestEmailChangeOTP,
  verifyEmailChangeOTP,
  verifyAdminPassword,
} from "../controllers/profile.controller.js";

const router = express.Router();

router.get("/me", verifyToken, getMyProfile);
router.put("/me", verifyToken, updateProfile);
router.put("/me/password", verifyToken, changePassword);
router.post("/me/verify-admin-password", verifyToken, verifyAdminPassword);

// ✅ profile photo (Cloudinary)
router.put(
  "/me/photo",
  verifyToken,
  upload.single("photo"),
  updateProfilePhoto,
);

// ✅ email change with OTP
router.post("/me/email/request-otp", verifyToken, requestEmailChangeOTP);
router.post("/me/email/verify-otp", verifyToken, verifyEmailChangeOTP);

export default router;
