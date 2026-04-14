import express from "express";
import {
  scanStudentStation,
  getCampusDashboardStats,
} from "../controllers/stationScan.controller.js";
import { getCampusMealSchedule } from "../controllers/mealSchedule.controller.js";
import { protectCampus } from "../middlewares/campusAuth.js";

const router = express.Router();

router.post("/students/station-scan", protectCampus, scanStudentStation);
router.get("/dashboard", protectCampus, getCampusDashboardStats);
router.get("/schedule", protectCampus, getCampusMealSchedule);

export default router;
