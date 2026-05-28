import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
} from "../controllers/report.controller.js";

const router = express.Router();

router.get("/daily", verifyToken, getDailyReport);
router.get("/weekly", verifyToken, getWeeklyReport);
router.get("/monthly", verifyToken, getMonthlyReport);

export default router;
