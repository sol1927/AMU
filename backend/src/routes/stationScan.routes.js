import express from "express";
import {
  scanStudentStation,
  getCampusDashboardStats,
} from "../controllers/stationScan.controller.js";
import { protectCampus } from "../middlewares/campusAuth.js";

const router = express.Router();

router.post("/students/station-scan", protectCampus, scanStudentStation);
router.get("/dashboard", protectCampus, getCampusDashboardStats);

export default router;
