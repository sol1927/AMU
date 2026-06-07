import express from "express";
import {
  logoutCampus,
  getCampusDashboard,
  heartbeatCampus,
  verifyCampusPassword,
  updateCampusProfile,
  selectCampusCafeNumber,
  requestCampusEmailOTP,
  verifyCampusEmailOTP,
} from "../controllers/campus.controller.js";
import {
  getCampusStudents,
  getCampusStudentsAll,
  getCampusBatches,
  getStudentsByBatch,
  bulkUpdateFasting,
  toggleInternshipStudent,
  bulkToggleInternshipStudents,
  updateStudentCafeNumber,
  syncCafeStudents,
  bulkUpdateStudentCafeNumbers,
} from "../controllers/student.controller.js";
import {
  getCampusMealSchedule,
  updateCampusMealSchedule,
} from "../controllers/mealSchedule.controller.js";
import { getMyApprovalRequest } from "../controllers/approval.controller.js";
import {
  protectCampus,
  requireCampusCafeSelection,
} from "../middlewares/campusAuth.js";

import {
  listCafes,
  createCafe,
  updateCafe,
  deleteCafe,
  listCafeManagers,
  createCafeManager,
  updateCafeManager,
  deleteCafeManager,
} from "../controllers/campus.controller.js";

import {
  getMeals,
  getMealStudents,
  getMealFilters,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

// Cafe user management (by campus)
router.get("/cafes", protectCampus, listCafes);
router.post("/cafes", protectCampus, createCafe);
router.patch("/cafes/:id", protectCampus, updateCafe);
router.delete("/cafes/:id", protectCampus, deleteCafe);

// Cafe manager management (by campus)
router.get("/cafe-managers", protectCampus, listCafeManagers);
router.post("/cafe-managers", protectCampus, createCafeManager);
router.patch("/cafe-managers/:id", protectCampus, updateCafeManager);
router.delete("/cafe-managers/:id", protectCampus, deleteCafeManager);

router.post("/logout", protectCampus, logoutCampus);
router.get("/dashboard", protectCampus, getCampusDashboard);
router.post("/heartbeat", protectCampus, heartbeatCampus);
router.post("/select-cafe-number", protectCampus, selectCampusCafeNumber);
router.patch("/profile", protectCampus, updateCampusProfile);
router.post("/profile/email/request-otp", protectCampus, requestCampusEmailOTP);
router.post("/profile/email/verify-otp", protectCampus, verifyCampusEmailOTP);
router.get("/profile/approvals", protectCampus, getMyApprovalRequest);
router.post("/students/sync", protectCampus, syncCafeStudents);
router.get("/schedule", protectCampus, getCampusMealSchedule);
router.put("/schedule", protectCampus, updateCampusMealSchedule);
router.get(
  "/students",
  protectCampus,
  requireCampusCafeSelection,
  getCampusStudents,
);
router.get("/students/all", protectCampus, getCampusStudentsAll);
router.post("/verify-campus-password", protectCampus, verifyCampusPassword);
router.get(
  "/students/batches",
  protectCampus,
  getCampusBatches,
);
router.get(
  "/students/batch/:batch",
  protectCampus,
  getStudentsByBatch,
);
router.patch(
  "/students/bulk-fasting",
  protectCampus,
  requireCampusCafeSelection,
  bulkUpdateFasting,
);
router.patch(
  "/students/:id/internship",
  protectCampus,
  requireCampusCafeSelection,
  toggleInternshipStudent,
);
router.patch(
  "/students/:id/cafe-number",
  protectCampus,
  updateStudentCafeNumber,
);
router.patch(
  "/students/bulk-internship",
  protectCampus,
  requireCampusCafeSelection,
  bulkToggleInternshipStudents,
);
router.patch(
  "/students/bulk-cafe-number",
  protectCampus,
  requireCampusCafeSelection,
  bulkUpdateStudentCafeNumbers,
);

// Meal History routes
router.get("/meals", protectCampus, getMeals);
router.get("/meals/students", protectCampus, getMealStudents);
router.get("/meal-filters", protectCampus, getMealFilters);

export default router;
