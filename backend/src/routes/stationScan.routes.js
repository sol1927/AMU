import express from "express";
import {
  scanStudentStation,
  getCampusDashboardStats,
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

export default router;
