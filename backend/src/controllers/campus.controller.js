import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Student from "../models/student.model.js";
import cloudinary from "../config/cloudinary.js";
import { formatFullName } from "../utils/formatName.js";

const campusAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export const createCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, location } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters",
      });
    }

    const existingCampus = await Campus.findOne({
      createdBy: req.userId,
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existingCampus) {
      return res.status(400).json({
        message: "A campus with this name already exists",
      });
    }

    const adminWithEmailOrName = await User.findOne({
      $or: [{ email }, { name }],
    });
    if (adminWithEmailOrName) {
      return res.status(400).json({
        message: "Campus email or name cannot be the same as an admin",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS) || 10,
    );

    const admin = await User.findById(req.userId).select("logo");

    const campus = await Campus.create({
      name: formatFullName(name.trim()),
      email,
      password: hashedPassword,
      location: location || "",
      createdBy: req.userId,
      logo: admin?.logo || {},
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
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const campuses = await Campus.find({ createdBy: req.userId })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const campusesWithStudentCount = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await Student.countDocuments({
          campus: campus._id,
        });
        return { ...campus, students: studentsCount };
      }),
    );
    res.json({ campuses: campusesWithStudentCount });
  } catch {
    res.status(500).json({ message: "Failed to fetch campuses" });
  }
};

// export const getCampus = async (req, res) => {
//   if (req.userRole !== "admin") {
//     return res.status(403).json({ message: "Access denied" });
//   }

//   const campus = await Campus.findOne({
//     _id: req.params.id,
//     createdBy: req.userId,
//   }).select("-password");

//   if (!campus) {
//     return res.status(404).json({ message: "Campus not found" });
//   }

//   res.json({ campus });
// };

export const updateCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, currentPassword, location } = req.body;

    const campus = await Campus.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    }).select("+password");

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      campus.email = email;
    }

    if (name) {
      const existingCampus = await Campus.findOne({
        _id: { $ne: req.params.id },
        createdBy: req.userId,
        name: { $regex: `^${name.trim()}$`, $options: "i" },
      });

      if (existingCampus) {
        return res.status(400).json({
          message: "A campus with this name already exists",
        });
      }

      campus.name = formatFullName(name.trim());
    }

    if (email || name) {
      const adminConflict = await User.findOne({
        $or: [{ email }, { name }],
      });
      if (adminConflict) {
        return res.status(400).json({
          message: "Campus email or name cannot be the same as an admin",
        });
      }
    }

    if (location !== undefined) campus.location = location;

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      const match = await bcrypt.compare(currentPassword, campus.password);
      if (!match) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const sameAsCurrent = await bcrypt.compare(password, campus.password);
      if (sameAsCurrent) {
        return res.status(400).json({
          message: "New password cannot be the same as current password",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters",
        });
      }

      campus.password = await bcrypt.hash(
        password,
        Number(process.env.SALT_ROUNDS) || 10,
      );
    }

    await campus.save();

    const { password: _password, ...campusData } = campus.toObject();

    res.json({
      message: "Campus updated successfully",
      campus: campusData,
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res
          .status(400)
          .json({ message: "This campus email is already in use." });
      }
      if (err.keyPattern?.name) {
        return res
          .status(400)
          .json({ message: "You already have a campus with this name." });
      }
    }

    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await Campus.findById(id);
    if (!campus) return res.status(404).json({ message: "Campus not found" });

    const students = await Student.find({ campus: campus._id });

    for (const student of students) {
      if (student.profilePublicId) {
        await cloudinary.uploader.destroy(student.profilePublicId);
      }
    }

    await Student.deleteMany({ campus: campus._id });

    if (campus.logoPublicId) {
      await cloudinary.uploader.destroy(campus.logoPublicId);
    }

    await Campus.findByIdAndDelete(id);

    res.json({ message: "Campus and its students deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getCampusDashboard = async (req, res) => {
  try {
    const campus = req.campus;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    res.json({
      campus: {
        name: campus.name,
        email: campus.email,
        location: campus.location,
        logo: campus.logo,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch campus info" });
  }
};

export const verifyCampusPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const campusId = req.campus._id.toString();
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    if (!campusAttempts.has(campusId)) {
      campusAttempts.set(campusId, { count: 0, firstAttemptAt: Date.now() });
    }

    const attempt = campusAttempts.get(campusId);

    if (Date.now() - attempt.firstAttemptAt > WINDOW_MS) {
      attempt.count = 0;
      attempt.firstAttemptAt = Date.now();
    }

    if (attempt.count >= MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil(
        (WINDOW_MS - (Date.now() - attempt.firstAttemptAt)) / 60000,
      );
      return res.status(429).json({
        message: `Too many attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const campus = await Campus.findById(campusId).select("+password");
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const isMatch = await bcrypt.compare(password, campus.password);
    if (!isMatch) {
      attempt.count += 1;
      campusAttempts.set(campusId, attempt);

      return res.status(401).json({
        message: `Wrong password. ${MAX_ATTEMPTS - attempt.count} attempt(s) left.`,
      });
    }

    campusAttempts.delete(campusId);
    return res.status(200).json({ message: "Password correct" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const logoutCampus = (req, res) => {
  res
    .cookie("campusToken", "", { httpOnly: true, expires: new Date(0) })
    .json({ message: "Logged out" });
};
