import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
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
router.put("/me/photo", verifyToken, updateProfilePhoto);
router.post("/me/email/request-otp", verifyToken, requestEmailChangeOTP);
router.post("/me/email/verify-otp", verifyToken, verifyEmailChangeOTP);

export default router;
