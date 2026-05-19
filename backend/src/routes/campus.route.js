import express from "express";
import {
  logoutCampus,
  getCampusDashboard,
  heartbeatCampus,
  verifyCampusPassword,
  updateCampusProfile,
  selectCampusCafeNumber,
} from "../controllers/campus.controller.js";
import {
  getCampusStudents,
  getCampusStudentsAll,
  getCampusBatches,
  getStudentsByBatch,
  bulkUpdateFasting,
  toggleInternshipStudent,
  bulkToggleInternshipStudents,
  updateStudentCafeNumber,
} from "../controllers/student.controller.js";
import {
  protectCampus,
  requireCampusCafeSelection,
} from "../middlewares/campusAuth.js";

const router = express.Router();

router.post("/logout", protectCampus, logoutCampus);
router.get("/dashboard", protectCampus, getCampusDashboard);
router.post("/heartbeat", protectCampus, heartbeatCampus);
router.post("/select-cafe-number", protectCampus, selectCampusCafeNumber);
router.patch("/profile", protectCampus, updateCampusProfile);
router.get(
  "/students",
  protectCampus,
  requireCampusCafeSelection,
  getCampusStudents,
);
router.get("/students/all", protectCampus, getCampusStudentsAll);
router.post("/verify-campus-password", protectCampus, verifyCampusPassword);
router.get(
  "/students/batches",
  protectCampus,
  requireCampusCafeSelection,
  getCampusBatches,
);
router.get(
  "/students/batch/:batch",
  protectCampus,
  requireCampusCafeSelection,
  getStudentsByBatch,
);
router.patch(
  "/students/bulk-fasting",
  protectCampus,
  requireCampusCafeSelection,
  bulkUpdateFasting,
);
router.patch(
  "/students/:id/internship",
  protectCampus,
  requireCampusCafeSelection,
  toggleInternshipStudent,
);
router.patch(
  "/students/:id/cafe-number",
  protectCampus,
  updateStudentCafeNumber,
);
router.patch(
  "/students/bulk-internship",
  protectCampus,
  requireCampusCafeSelection,
  bulkToggleInternshipStudents,
);

export default router;
