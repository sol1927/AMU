import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Student from "../models/student.model.js";
import cloudinary from "../config/cloudinary.js";
import upload from "../middlewares/upload.js";

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
      .select("name studentId batch department profileUrl fastingType"); // ✅ added fastingType

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
    const { name, studentId, batch, department, fastingType } = req.body;

    // ✅ Validate required fields
    if (!name || !studentId || !batch || !department) {
      return res.status(400).json({
        message: "Name, studentId, batch, and department are required",
      });
    }

    // ✅ Validate fastingType (optional but safe)
    const allowedFastingTypes = ["not_fasting", "fasting", "sunday_fasting"];
    const finalFastingType = allowedFastingTypes.includes(fastingType)
      ? fastingType
      : "not_fasting";

    let profileUrl = "";
    let profilePublicId = "";

    if (req.file) {
      profileUrl = req.file.path;
      profilePublicId = req.file.filename.replace(/\.[^.]+$/, "");
    }

    const student = await Student.create({
      name,
      studentId,
      batch,
      department,
      fastingType: finalFastingType, // ✅ added
      profileUrl,
      profilePublicId,
      campus: req.campus._id,
    });

    res.status(201).json({ message: "Student added", student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Student ID must be unique" });
    }

    console.error("Add student error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------- Update Student ----------
// PATCH /api/campus/students/:id
export const updateStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department, fastingType } = req.body;

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
    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting"].includes(fastingType)
    ) {
      student.fastingType = fastingType; // ✅ Update fastingType
    }

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

    // Delete old photo
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

    // Save new photo
    student.profileUrl = req.file.path;
    student.profilePublicId = req.file.filename.replace(/\.[^.]+$/, "");

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
