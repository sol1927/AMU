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

router.put("/me/photo", verifyToken, (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "📸 Profile photo is too big! Please keep it under 5MB."
          : "🚫 Invalid file type. Use JPG, PNG, or WebP.";
      return res.status(400).json({ message });
    }
    updateProfilePhoto(req, res, next);
  });
});

router.post("/me/email/request-otp", verifyToken, requestEmailChangeOTP);
router.post("/me/email/verify-otp", verifyToken, verifyEmailChangeOTP);

export default router;
