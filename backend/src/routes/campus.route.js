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
  getCampusBatches,
  getStudentsByBatch,
  deleteBatch,
  bulkDeleteStudents,
  bulkUpdateFasting,
  toggleInternshipStudent,
  bulkToggleInternshipStudents,
} from "../controllers/student.controller.js";
import { protectCampus } from "../middlewares/campusAuth.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/logout", logoutCampus);
router.get("/dashboard", protectCampus, getCampusDashboard);
router.post("/students", protectCampus, (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "📸 Photo is too big! Please keep it under 5MB."
          : "🚫 Invalid file type. Use JPG, PNG, or WebP.";
      return res.status(400).json({ message });
    }
    addStudent(req, res, next);
  });
});
router.get("/students", protectCampus, getCampusStudents);
router.post("/verify-campus-password", protectCampus, verifyCampusPassword);
router.put("/students/:id", protectCampus, updateStudent);
router.delete("/students/:id", protectCampus, deleteStudent);
router.get("/students/batches", protectCampus, getCampusBatches);
router.get("/students/batch/:batch", protectCampus, getStudentsByBatch);
router.delete("/students/batch/:batch", protectCampus, deleteBatch);
router.post("/students/bulk-delete", protectCampus, bulkDeleteStudents);
router.patch("/students/bulk-fasting", protectCampus, bulkUpdateFasting);
router.patch(
  "/students/:id/internship",
  protectCampus,
  toggleInternshipStudent,
);
router.patch(
  "/students/bulk-internship",
  protectCampus,
  bulkToggleInternshipStudents,
);
router.put("/students/:id/photo", protectCampus, (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "📸 Photo is too big! Please keep it under 2MB."
          : "🚫 Invalid file type. Use JPG, PNG, or WebP.";
      return res.status(400).json({ message });
    }
    updateStudentPhoto(req, res, next);
  });
});

export default router;
