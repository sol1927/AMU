import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { selectCafeNumber } from "../controllers/auth.controller.js";
import { bulkUpdateFasting } from "../controllers/student.controller.js";

const router = express.Router();

// Station selection
router.post("/select-cafe-number", verifyToken, selectCafeNumber);

// Student fasting assignment
router.patch("/students/bulk-fasting", verifyToken, bulkUpdateFasting);

export default router;
