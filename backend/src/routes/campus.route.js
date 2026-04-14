import express from "express";
import {
  logoutCampus,
  getCampusDashboard,
  verifyCampusPassword,
  updateCampusProfile,
} from "../controllers/campus.controller.js";
import {
  getCampusStudents,
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

const router = express.Router();

router.post("/logout", protectCampus, logoutCampus);
router.get("/dashboard", protectCampus, getCampusDashboard);
router.patch("/profile", protectCampus, updateCampusProfile);
router.get("/students", protectCampus, getCampusStudents);
router.post("/verify-campus-password", protectCampus, verifyCampusPassword);
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

export default router;
