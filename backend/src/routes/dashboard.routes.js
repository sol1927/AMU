import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getAdminDashboard,
  getMeals,
  getMealFilters,
} from "../controllers/dashboard.controller.js";
import {
  getMealSchedule,
  updateMealSchedule,
} from "../controllers/mealSchedule.controller.js";
import {
  createCampus,
  getCampuses,
  updateCampus,
  deleteCampus,
  selfUpdateCampus,
} from "../controllers/campus.controller.js";
import { syncCafeStudents } from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", verifyToken, getAdminDashboard);
router.get("/meals", verifyToken, getMeals);
router.get("/meal-filters", verifyToken, getMealFilters);
router.get("/meal-schedule/:campusId", verifyToken, getMealSchedule);
router.put("/meal-schedule/:campusId", verifyToken, updateMealSchedule);
router.post("/campuses", verifyToken, createCampus);
router.get("/campuses", verifyToken, getCampuses);
router.patch("/campuses/:id", verifyToken, updateCampus);
router.post("/campuses/:id/sync-students", verifyToken, syncCafeStudents);
router.delete("/campuses/:id", verifyToken, deleteCampus);
router.patch("/campuses/selfUpdate/:id", verifyToken, selfUpdateCampus);

export default router;
