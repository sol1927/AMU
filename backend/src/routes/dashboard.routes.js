import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getAdminDashboard,
  getMeals,
  getMealFilters,
  getMealStudents,
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
import {
  getCampusStudents,
  getCampusBatches,
  getStudentsByBatch,
  bulkUpdateFasting,
  bulkToggleInternshipStudents,
  assignBatchToCafeNumber,
  bulkUpdateStudentCafeNumbers,
} from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", verifyToken, getAdminDashboard);
router.get("/meals", verifyToken, getMeals);
router.get("/meals/students", verifyToken, getMealStudents);
router.get("/meal-filters", verifyToken, getMealFilters);
router.get("/meal-schedule/:campusId", verifyToken, getMealSchedule);
router.put("/meal-schedule/:campusId", verifyToken, updateMealSchedule);
router.post("/campuses", verifyToken, createCampus);
router.get("/campuses", verifyToken, getCampuses);
router.get("/campuses/:id/students", verifyToken, getCampusStudents);
router.get("/campuses/:id/students/batches", verifyToken, getCampusBatches);
router.patch(
  "/campuses/:id/students/batches/:batch/cafe-number",
  verifyToken,
  assignBatchToCafeNumber,
);
router.get(
  "/campuses/:id/students/batch/:batch",
  verifyToken,
  getStudentsByBatch,
);
router.patch(
  "/campuses/:id/students/bulk-fasting",
  verifyToken,
  bulkUpdateFasting,
);
router.patch(
  "/campuses/:id/students/bulk-internship",
  verifyToken,
  bulkToggleInternshipStudents,
);
router.patch(
  "/campuses/:id/students/bulk-cafe-number",
  verifyToken,
  bulkUpdateStudentCafeNumbers,
);
router.patch("/campuses/:id", verifyToken, updateCampus);
router.delete("/campuses/:id", verifyToken, deleteCampus);
router.patch("/campuses/selfUpdate/:id", verifyToken, selfUpdateCampus);

export default router;
