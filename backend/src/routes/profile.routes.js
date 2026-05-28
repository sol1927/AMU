import express from "express";
import { verifyToken, requireCafe } from "../middlewares/auth.middleware.js";
import { setCafeNumber } from "../controllers/profile.controller.js";

const router = express.Router();

router.post("/set-cafe-number", verifyToken, requireCafe, setCafeNumber);

export default router;
