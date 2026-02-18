import express from "express";
import {
  scanStudentStation,
  clearStationData,
} from "../controllers/stationScan.controller.js";
import { protectCampus } from "../middlewares/campusAuth.js";

const router = express.Router();

router.post("/students/station-scan", protectCampus, scanStudentStation);
router.delete("/students/clear-station", protectCampus, clearStationData);

export default router;
