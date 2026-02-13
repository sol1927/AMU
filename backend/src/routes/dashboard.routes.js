import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getAdminDashboard,
} from "../controllers/dashboard.controller.js";
import {
  createCampus,
  getCampuses,
  // getCampus,
  updateCampus,
  deleteCampus,
} from "../controllers/campus.controller.js";

const router = express.Router();

// Admin dashboard
router.get("/", verifyToken, getAdminDashboard);

// Campuses
router.post("/campuses", verifyToken, createCampus);
router.get("/campuses", verifyToken, getCampuses);
// router.get("/campuses/:id", verifyToken, getCampus);
router.put("/campuses/:id", verifyToken, updateCampus);
router.delete("/campuses/:id", verifyToken, deleteCampus);

export default router;
