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

    // Apply updates depending on requestType
    if (request.requestType === "create_cafe") {
      const { name, password, displayName, campusId } = request.pendingData;
      // Check if user already exists
      const existingUser = await User.findOne({ name, role: "cafe" });
      if (existingUser) {
        return res.status(400).json({ message: "A cafe with this username already exists." });
      }
      await User.create({
        name,
        email: null,
        password,
        role: "cafe",
        campusId,
        displayName: displayName || null,
        createdBy: request.requesterId,
        mustChangePassword: false,
      });
    } else if (request.requestType === "update_cafe") {
      const { cafeId, name, displayName, password } = request.pendingData;
      const cafe = await User.findById(cafeId);
      if (!cafe) {
        return res.status(404).json({ message: "Cafe to update not found." });
      }
      const updateData = {};
      if (name) {
        const existingUser = await User.findOne({ name, role: "cafe", excludeId: cafeId });
        if (existingUser) {
          return res.status(400).json({ message: "A cafe with this username already exists." });
        }
        updateData.name = name;
        updateData.email = null;
      }
      if (displayName !== undefined) {
        updateData.displayName = displayName;
      }
      if (password) {
        updateData.password = password;
        updateData.mustChangePassword = false;
      }
      await User.updateById(cafeId, updateData);
    } else if (request.requestType === "delete_cafe") {
      const { cafeId } = request.pendingData;
      const cafe = await User.findById(cafeId);
      if (!cafe) {
        return res.status(404).json({ message: "Cafe to delete not found." });
      }
      await User.deleteById(cafeId);
    } else if (request.requestType === "create_cafe_manager") {
      const { name, email, password, campusId } = request.pendingData;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists." });
      }
      await User.create({
        name,
        email,
        password,
        role: "cafe manager",
        campusId,
        createdBy: request.requesterId,
        mustChangePassword: true,
      });
    } else if (request.requestType === "update_cafe_manager") {
      const { managerId, name, email, password } = request.pendingData;
      const cafeManager = await User.findById(managerId);
      if (!cafeManager) {
        return res.status(404).json({ message: "Cafe manager to update not found." });
      }
      const updateData = {};
      if (name) {
        updateData.name = name;
      }
      if (email) {
        const existingUser = await User.findOne({ email, excludeId: managerId });
        if (existingUser) {
          return res.status(400).json({ message: "A user with this email already exists." });
        }
        updateData.email = email;
      }
      if (password) {
        updateData.password = password;
        updateData.mustChangePassword = true;
      }
      await User.updateById(managerId, updateData);
    } else if (request.requestType === "delete_cafe_manager") {
      const { managerId } = request.pendingData;
      const cafeManager = await User.findById(managerId);
      if (!cafeManager) {
        return res.status(404).json({ message: "Cafe manager to delete not found." });
      }
      await User.deleteById(managerId);
    } else {
      // Default: profile_update
      const updates = { ...request.pendingData };
      if (updates.password) {
        updates.mustChangePassword = false;
      }
      await User.updateById(request.requesterId, updates);
    }

    // Mark request as approved
    await PendingApproval.updateById(id, { status: "approved" });

    res.json({ message: "Approval request approved and applied successfully." });
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

    res.json({ message: "Approval request has been rejected." });
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
    const pendingRequests = requests.filter((req) => req.status === "pending");
    const pending = pendingRequests[0] || null;
    res.json({ pending, requests: requests });

    // Clean up resolved requests from database immediately
    const resolved = requests.filter((r) => r.status === "approved" || r.status === "rejected");
    if (resolved.length > 0) {
      for (const r of resolved) {
        await PendingApproval.deleteById(r.id);
      }
    }
  } catch (err) {
    logInternalError("get-my-approval", err);
    sendServerError(res, "Could not fetch active approval request status.");
  }
};
