import express from "express";
import {
  scanStudentStation,
  getCampusDashboardStats,
  uploadOfflineScans,
  getSyncSession,
  getSyncStudents,
} from "../controllers/stationScan.controller.js";
import { getCampusMealSchedule } from "../controllers/mealSchedule.controller.js";
import {
  protectCampus,
  requireCampusCafeSelection,
} from "../middlewares/campusAuth.js";

const router = express.Router();

router.post("/students/station-scan", protectCampus, requireCampusCafeSelection, scanStudentStation);
router.get("/dashboard", protectCampus, requireCampusCafeSelection, getCampusDashboardStats);
router.get("/schedule", protectCampus, requireCampusCafeSelection, getCampusMealSchedule);

// Offline-first sync endpoints
router.post("/students/offline-scan-upload", protectCampus, requireCampusCafeSelection, uploadOfflineScans);
router.get("/sync/session", protectCampus, requireCampusCafeSelection, getSyncSession);
router.get("/sync/students", protectCampus, requireCampusCafeSelection, getSyncStudents);

export default router;

