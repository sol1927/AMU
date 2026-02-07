import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";
import {
  getMyProfile,
  updateProfile,
  changePassword,
  updateProfilePhoto,
} from "../controllers/profile.controller.js";

const router = express.Router();

router.get("/me", verifyToken, getMyProfile);
router.put("/me", verifyToken, updateProfile);
router.put("/me/password", verifyToken, changePassword);

// ✅ profile photo (Cloudinary)
router.put(
  "/me/photo",
  verifyToken,
  upload.single("photo"),
  updateProfilePhoto,
);

export default router;
