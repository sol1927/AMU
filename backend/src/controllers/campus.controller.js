import Campus from "../models/campus.model.js";
import bcrypt from "bcryptjs";

export const createCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS) || 10,
    );

    const campus = await Campus.create({
      name,
      email,
      password: hashedPassword,
      createdBy: req.userId,
    });

    const { password: _password, ...campusData } = campus.toObject();
    res.status(201).json({
      message: "Campus created successfully",
      campus: campusData,
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(400).json({
          message: "This campus email is already in use.",
        });
      }

      if (err.keyPattern?.name) {
        return res.status(400).json({
          message: "You already have a campus with this name.",
        });
      }
    }

    res.status(500).json({ message: "Failed to create campus" });
  }
};

export const getCampuses = async (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const campuses = await Campus.find({ createdBy: req.userId })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({ campuses });
};

export const getCampus = async (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const campus = await Campus.findOne({
    _id: req.params.id,
    createdBy: req.userId,
  }).select("-password");

  if (!campus) {
    return res.status(404).json({ message: "Campus not found" });
  }

  res.json({ campus });
};

export const updateCampus = async (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { name, email, password } = req.body;

  const campus = await Campus.findOne({
    _id: req.params.id,
    createdBy: req.userId,
  });

  if (!campus) {
    return res.status(404).json({ message: "Campus not found" });
  }

  if (name) campus.name = name;
  if (email) campus.email = email;
  if (password) campus.password = await bcrypt.hash(password, 10);

  await campus.save();

  res.json({ message: "Campus updated successfully", campus });
};

export const deleteCampus = async (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const campus = await Campus.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.userId,
  });

  if (!campus) {
    return res.status(404).json({ message: "Campus not found" });
  }

  res.json({ message: "Campus deleted successfully" });
};
