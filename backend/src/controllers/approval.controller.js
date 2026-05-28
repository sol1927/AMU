import PendingApproval from "../models/pendingApproval.model.js";
import User from "../models/user.model.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

// Submit a profile update request
export const createApprovalRequest = async (req, res) => {
  try {
    const { name, email, location, logo, password } = req.body;
    const requesterId = req.userId;
    const role = req.userRole;

    if (role !== "campus" && role !== "cafe manager") {
      return res
        .status(403)
        .json({
          message:
            "Only campus or cafe manager users can request profile updates.",
        });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (location !== undefined)
      updates.location = location ? location.trim() : "";
    if (logo) updates.logo = logo;
    if (password) updates.password = password; // Raw password will be hashed on save when approved!

    const approverRole = role === "campus" ? "admin" : "campus";

    // Delete any existing pending approval request for this requester
    const existing = await PendingApproval.findAll({
      requesterId,
      status: "pending",
    });
    await Promise.all(
      existing.map((req) => PendingApproval.deleteById(req.id)),
    );

    const request = await PendingApproval.create({
      requesterId,
      approverRole,
      requestType: "profile_update",
      pendingData: updates,
    });

    res.status(201).json({
      message: "Your profile changes have been submitted for approval.",
      request,
    });
  } catch (err) {
    logInternalError("create-approval-request", err);
    sendServerError(res, "Could not submit approval request.");
  }
};

// List pending approval requests scoped by role
export const listPendingApprovals = async (req, res) => {
  try {
    const role = req.userRole;
    let requests = [];

    if (role === "admin") {
      // Admins see all pending campus requests
      requests = await PendingApproval.findAll({
        approverRole: "admin",
        status: "pending",
      });
    } else if (role === "campus") {
      // Campuses see pending cafe requests under their campus
      const rawRequests = await PendingApproval.findAll({
        approverRole: "campus",
        status: "pending",
      });
      const campusId = req.user.campusId;

      // Filter requests where the requester's campusId matches
      const filtered = [];
      await Promise.all(
        rawRequests.map(async (request) => {
          const requester = await User.findById(request.requesterId);
          if (requester && Number(requester.campusId) === Number(campusId)) {
            filtered.push({
              ...request,
              requesterName: requester.name,
              requesterEmail: requester.email,
            });
          }
        }),
      );
      requests = filtered;
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    // Attach requester info for Admins as well
    if (role === "admin") {
      const detailed = [];
      await Promise.all(
        requests.map(async (request) => {
          const requester = await User.findById(request.requesterId);
          if (requester) {
            detailed.push({
              ...request,
              requesterName: requester.name,
              requesterEmail: requester.email,
            });
          }
        }),
      );
      requests = detailed;
    }

    res.json({ requests });
  } catch (err) {
    logInternalError("list-pending-approvals", err);
    sendServerError(res, "Could not fetch approval requests.");
  }
};

// Approve a profile update request
export const approveApprovalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PendingApproval.findById(id);

    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Pending request not found." });
    }

    // Access control
    if (req.userRole === "admin") {
      if (request.approverRole !== "admin") {
        return res.status(403).json({ message: "Access denied." });
      }
    } else if (req.userRole === "campus") {
      if (request.approverRole !== "campus") {
        return res.status(403).json({ message: "Access denied." });
      }
      const requester = await User.findById(request.requesterId);
      if (
        !requester ||
        Number(requester.campusId) !== Number(req.user.campusId)
      ) {
        return res
          .status(403)
          .json({
            message: "Access denied: Cafe does not belong to your campus.",
          });
      }
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    // Apply updates to the user table
    const updates = { ...request.pendingData };
    if (updates.password) {
      updates.mustChangePassword = false;
    }
    await User.updateById(request.requesterId, updates);

    // Mark request as approved
    await PendingApproval.updateById(id, { status: "approved" });

    res.json({ message: "Profile update approved and applied successfully." });
  } catch (err) {
    logInternalError("approve-request", err);
    sendServerError(res, "Could not approve request.");
  }
};

// Reject a profile update request
export const rejectApprovalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PendingApproval.findById(id);

    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Pending request not found." });
    }

    // Access control
    if (req.userRole === "admin") {
      if (request.approverRole !== "admin") {
        return res.status(403).json({ message: "Access denied." });
      }
    } else if (req.userRole === "campus") {
      if (request.approverRole !== "campus") {
        return res.status(403).json({ message: "Access denied." });
      }
      const requester = await User.findById(request.requesterId);
      if (
        !requester ||
        Number(requester.campusId) !== Number(req.user.campusId)
      ) {
        return res
          .status(403)
          .json({
            message: "Access denied: Cafe does not belong to your campus.",
          });
      }
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    // Mark request as rejected
    await PendingApproval.updateById(id, { status: "rejected" });

    res.json({ message: "Profile update request has been rejected." });
  } catch (err) {
    logInternalError("reject-request", err);
    sendServerError(res, "Could not reject request.");
  }
};

// Get active request status for the logged-in user
export const getMyApprovalRequest = async (req, res) => {
  try {
    const requesterId = req.userId;
    const requests = await PendingApproval.findAll({ requesterId });
    const pending = requests.find((req) => req.status === "pending") || null;
    res.json({ pending });
  } catch (err) {
    logInternalError("get-my-approval", err);
    sendServerError(res, "Could not fetch active approval request status.");
  }
};
