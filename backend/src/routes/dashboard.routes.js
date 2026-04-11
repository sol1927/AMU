import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getAdminDashboard,
  getMeals,
  getMealFilters,
} from "../controllers/dashboard.controller.js";
import {
  createCampus,
  getCampuses,
  // getCampus,
  updateCampus,
  deleteCampus,
  selfUpdateCampus,
} from "../controllers/campus.controller.js";

const router = express.Router();

router.get("/", verifyToken, getAdminDashboard);
router.get("/meals", verifyToken, getMeals);
router.get("/meal-filters", verifyToken, getMealFilters);
router.post("/campuses", verifyToken, createCampus);
router.get("/campuses", verifyToken, getCampuses);
router.patch("/campuses/:id", verifyToken, updateCampus);
router.delete("/campuses/:id", verifyToken, deleteCampus);
router.patch("/campuses/selfUpdate/:id", verifyToken, selfUpdateCampus);

export default router;
