import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token)
    return res
      .status(401)
      .json({ message: "Please log in to access this page." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Your session has expired. Please log in again." });
  }
};
