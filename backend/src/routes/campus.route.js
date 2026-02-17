import express from "express";
import {
  logoutCampus,
  getCampusDashboard,
  verifyCampusPassword,
} from "../controllers/campus.controller.js";
import {
  getCampusStudents,
  addStudent,
  updateStudent,
  updateStudentPhoto,
  deleteStudent,
} from "../controllers/student.controller.js";
import { protectCampus } from "../middlewares/campusAuth.js";
import upload from "../middlewares/upload.js"; // multer-cloudinary

const router = express.Router();

// ---------- Campus Logout ----------
router.post("/logout", logoutCampus);

// ---------- Campus Dashboard ----------
router.get("/dashboard", protectCampus, getCampusDashboard);

// ---------- Add New Student (optional photo upload) ----------
router.post("/students", protectCampus, upload.single("photo"), addStudent);

// ---------- Get All Students ----------
router.get("/students", protectCampus, getCampusStudents);

// ---------- Verify Campus Password ----------
router.post("/verify-campus-password", protectCampus, verifyCampusPassword);

// ---------- Update Student ----------
router.put("/students/:id", protectCampus, updateStudent);

// ---------- Delete Student ----------
router.delete("/students/:id", protectCampus, deleteStudent);

// ---------- Update Student Photo ----------
router.put(
  "/students/:id/photo",
  protectCampus,
  upload.single("photo"),
  updateStudentPhoto,
);

export default router;
