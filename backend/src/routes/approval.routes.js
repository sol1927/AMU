import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  createApprovalRequest,
  listPendingApprovals,
  approveApprovalRequest,
  rejectApprovalRequest,
  getMyApprovalRequest,
} from "../controllers/approval.controller.js";

const router = express.Router();

router.post("/", verifyToken, createApprovalRequest);
router.get("/", verifyToken, listPendingApprovals);
router.get("/me", verifyToken, getMyApprovalRequest);
router.post("/:id/approve", verifyToken, approveApprovalRequest);
router.post("/:id/reject", verifyToken, rejectApprovalRequest);

export default router;
