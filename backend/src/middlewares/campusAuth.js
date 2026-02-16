import jwt from "jsonwebtoken";
import Campus from "../models/campus.model.js";

export const protectCampus = async (req, res, next) => {
  const token = req.cookies.campusToken;
  if (!token) return res.status(401).json({ message: "Please log in" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const campus = await Campus.findById(decoded.id).select("-password");
    if (!campus) return res.status(401).json({ message: "Unauthorized" });

    req.campus = campus; // attach campus info
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired" });
  }
};
