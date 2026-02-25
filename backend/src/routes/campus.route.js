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
router.post("/students", protectCampus, upload.single("photo"), addStudent);
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
router.put(
  "/students/:id/photo",
  protectCampus,
  upload.single("photo"),
  updateStudentPhoto,
);

export default router;
