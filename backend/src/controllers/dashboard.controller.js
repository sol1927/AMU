import Campus from "../models/campus.model.js";

export const getAdminDashboard = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const campusCount = await Campus.countDocuments({
      createdBy: req.userId,
    });

    res.json({
      stats: {
        campuses: campusCount,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};
