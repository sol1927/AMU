import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Student from "../models/student.model.js";
import cloudinary from "../config/cloudinary.js";
import upload from "../middlewares/upload.js";

// In-memory attempt tracker
const campusAttempts = new Map();
const MAX_ATTEMPTS = 5; // max tries
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

export const createCampus = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, location } = req.body;

    // ✅ Check valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters",
      });
    }

    // Check if a campus with the same name already exists (case-insensitive)
    const existingCampus = await Campus.findOne({
      createdBy: req.userId,
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existingCampus) {
      return res.status(400).json({
        message: "A campus with this name already exists",
      });
    }

    // Check if name/email conflicts with admin
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
      name,
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

    // Fetch all campuses created by this admin
    const campuses = await Campus.find({ createdBy: req.userId })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean(); // plain JS objects

    // Add the actual student count for each campus
    const campusesWithStudentCount = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await Student.countDocuments({
          campus: campus._id,
        });
        return { ...campus, students: studentsCount };
      }),
    );
    res.json({ campuses: campusesWithStudentCount });
  } catch (err) {
    console.error(err);
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

    // Fetch campus including password
    const campus = await Campus.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    }).select("+password");

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    // ✅ Validate email format if updating
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      campus.email = email;
    }

    // Case-insensitive check for name
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

      campus.name = name;
    }

    // Check conflict with admin
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

    // Update location if provided
    if (location !== undefined) campus.location = location;

    // Password update
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

    console.error(err);
    res.status(500).json({ message: "Failed to update campus" });
  }
};

export const deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find campus
    const campus = await Campus.findById(id);
    if (!campus) return res.status(404).json({ message: "Campus not found" });

    // 2️⃣ Delete all students of that campus
    const students = await Student.find({ campus: campus._id });

    // 3️⃣ Delete each student's photo from Cloudinary
    for (const student of students) {
      if (student.profilePublicId) {
        await cloudinary.uploader.destroy(student.profilePublicId);
      }
    }

    // 4️⃣ Remove students from DB
    await Student.deleteMany({ campus: campus._id });

    // 5️⃣ Remove campus logo from Cloudinary if exists
    if (campus.logoPublicId) {
      await cloudinary.uploader.destroy(campus.logoPublicId);
    }

    // 6️⃣ Delete campus itself
    await Campus.findByIdAndDelete(id);

    res.json({ message: "Campus and its students deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- Campus Dashboard ----------
// GET /api/campus/dashboard
export const getCampusDashboard = async (req, res) => {
  try {
    const campus = req.campus; // set from auth middleware

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campus info" });
  }
};

export const verifyCampusPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const campusId = req.campus._id.toString(); // unique key per campus

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    // Initialize attempts record if missing
    if (!campusAttempts.has(campusId)) {
      campusAttempts.set(campusId, { count: 0, firstAttemptAt: Date.now() });
    }

    const attempt = campusAttempts.get(campusId);

    // Reset attempts if window passed
    if (Date.now() - attempt.firstAttemptAt > WINDOW_MS) {
      attempt.count = 0;
      attempt.firstAttemptAt = Date.now();
    }

    // Block if max attempts reached
    if (attempt.count >= MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil(
        (WINDOW_MS - (Date.now() - attempt.firstAttemptAt)) / 60000,
      );
      return res.status(429).json({
        message: `Too many attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    // Fetch campus password
    const campus = await Campus.findById(campusId).select("+password");
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const isMatch = await bcrypt.compare(password, campus.password);
    if (!isMatch) {
      attempt.count += 1; // increment attempts
      campusAttempts.set(campusId, attempt);

      return res.status(401).json({
        message: `Wrong password. ${MAX_ATTEMPTS - attempt.count} attempt(s) left.`,
      });
    }

    // Success → reset attempts
    campusAttempts.delete(campusId);
    return res.status(200).json({ message: "Password correct" });
  } catch (err) {
    console.error("verifyCampusPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Campus Logout ----------
export const logoutCampus = (req, res) => {
  res
    .cookie("campusToken", "", { httpOnly: true, expires: new Date(0) })
    .json({ message: "Logged out" });
};
