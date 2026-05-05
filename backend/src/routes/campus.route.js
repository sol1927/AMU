import express from "express";
import {
  logoutCampus,
  getCampusDashboard,
  heartbeatCampus,
  verifyCampusPassword,
  updateCampusProfile,
} from "../controllers/campus.controller.js";
import {
  getCampusStudents,
  getCampusBatches,
  getStudentsByBatch,
  bulkUpdateFasting,
  toggleInternshipStudent,
  bulkToggleInternshipStudents,
} from "../controllers/student.controller.js";
import { protectCampus } from "../middlewares/campusAuth.js";

const router = express.Router();

router.post("/logout", protectCampus, logoutCampus);
router.get("/dashboard", protectCampus, getCampusDashboard);
router.post("/heartbeat", protectCampus, heartbeatCampus);
router.patch("/profile", protectCampus, updateCampusProfile);
router.get("/students", protectCampus, getCampusStudents);
router.post("/verify-campus-password", protectCampus, verifyCampusPassword);
router.get("/students/batches", protectCampus, getCampusBatches);
router.get("/students/batch/:batch", protectCampus, getStudentsByBatch);
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
