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

const formatMinutes = (ms) => Math.ceil(ms / 60000);

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
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const campuses = await Campus.find({ createdBy: req.userId })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({ campuses });
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

// GET /api/campus/students?search=optionalQuery
export const getCampusStudents = async (req, res) => {
  try {
    const campus = req.campus; // set from auth middleware
    const search = req.query.search || "";

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    // Find students for this campus
    const students = await Student.find({
      campus: campus._id,
      name: { $regex: search, $options: "i" },
    })
      .sort({ name: 1 })
      .select("name studentId batch department profileUrl");

    if (!students.length) {
      return res.json({ students: [] }); // frontend can show "Student not found"
    }

    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

// Add student with optional photo upload
export const addStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department } = req.body;

    // ✅ Validate required fields
    if (!name || !studentId || !batch || !department) {
      return res.status(400).json({
        message: "Name, studentId, batch, and department are required",
      });
    }

    let profileUrl = "";
    let profilePublicId = "";

    if (req.file) {
      // ✅ Upload to Cloudinary: store URL and correct public_id (without extension)
      profileUrl = req.file.path;
      profilePublicId = req.file.filename.replace(/\.[^.]+$/, ""); // remove file extension
    }

    const student = await Student.create({
      name,
      studentId,
      batch,
      department,
      profileUrl,
      profilePublicId,
      campus: req.campus._id,
    });

    res.status(201).json({ message: "Student added", student });
  } catch (error) {
    // Handle duplicate studentId
    if (error.code === 11000) {
      return res.status(400).json({ message: "Student ID must be unique" });
    }

    console.error("Add student error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const verifyCampusPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    // Use campus from middleware
    const campus = await Campus.findById(req.campus._id).select("+password");
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const isMatch = await bcrypt.compare(password, campus.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    return res.status(200).json({ message: "Password correct" });
  } catch (err) {
    console.error("verifyCampusPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- Update Student ----------
// PATCH /api/campus/students/:id
export const updateStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department } = req.body;

    // Fetch student and verify it belongs to this campus
    const student = await Student.findOne({
      _id: req.params.id,
      campus: req.campus._id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update fields if provided
    if (name) student.name = name;
    if (studentId) student.studentId = studentId;
    if (batch) student.batch = batch;
    if (department) student.department = department;

    await student.save();

    res.json({
      message: "Student updated successfully",
      student,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Student ID must be unique" });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to update student" });
  }
};

// ---------- Update Student Photo ----------
export const updateStudentPhoto = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No image received" });

    const student = await Student.findOne({
      _id: req.params.id,
      campus: req.campus._id,
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Delete old photo from Cloudinary if exists
    if (student.profilePublicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          student.profilePublicId,
        );
        if (result.result !== "ok" && result.result !== "not found") {
          console.warn(`Cloudinary deletion issue: ${result.result}`);
        }
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    }

    // Save new photo info
    student.profileUrl = req.file.path;
    student.profilePublicId = req.file.filename.replace(/\.[^.]+$/, ""); // remove extension

    await student.save();

    res.json({
      message: "Student photo updated",
      profileUrl: student.profileUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update photo" });
  }
};

// ---------- Delete Student ----------
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      campus: req.campus._id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Delete photo from Cloudinary if exists
    if (student.profilePublicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          student.profilePublicId,
        );
        if (result.result !== "ok" && result.result !== "not found") {
          console.warn(`Cloudinary deletion issue: ${result.result}`);
        }
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    }

    await student.deleteOne();

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete student" });
  }
};

// ---------- Campus Logout ----------
export const logoutCampus = (req, res) => {
  res
    .cookie("campusToken", "", { httpOnly: true, expires: new Date(0) })
    .json({ message: "Logged out" });
};
