import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
  let token = req.cookies.accessToken;
  if (!token) {
    token = req.cookies.campusToken;
  }
  
  if (!token)
    return res
      .status(401)
      .json({ message: "Please log in to access this page." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
    }

    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Your session has expired. Please log in again." });
  }
};
