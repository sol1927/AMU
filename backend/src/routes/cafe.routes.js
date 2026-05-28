import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  listTickers,
  createTicker,
  updateTicker,
  deleteTicker,
  selectCafeNumber,
} from "../controllers/ticker.controller.js";
import { bulkUpdateFasting } from "../controllers/student.controller.js";

const router = express.Router();

// Station selection (allowed for cafe and ticker roles)
router.post("/select-cafe-number", verifyToken, selectCafeNumber);

// Ticker CRUD (only allowed for cafe manager)
router.get("/tickers", verifyToken, listTickers);
router.post("/tickers", verifyToken, createTicker);
router.patch("/tickers/:id", verifyToken, updateTicker);
router.delete("/tickers/:id", verifyToken, deleteTicker);

// Student fasting assignment
router.patch("/students/bulk-fasting", verifyToken, bulkUpdateFasting);

export default router;
