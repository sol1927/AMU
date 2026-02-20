import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Student from "../models/student.model.js";
import cloudinary from "../config/cloudinary.js";
import upload from "../middlewares/upload.js";
import StationScan from "../models/stationScan.model.js";

// Helper to safely parse batch as a number
const parseBatch = (input) => {
  const batch = Number(input);
  if (Number.isNaN(batch)) return null;
  return batch;
};

export const getCampusStudents = async (req, res) => {
  try {
    const campus = req.campus;
    const search = req.query.search || "";
    const fastingType = req.query.fastingType; // ✅ new

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const query = {
      campus: campus._id,
    };

    // 🔎 Search by name, ID, department
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    // 🍽 Filter by fastingType (exact match)
    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting"].includes(fastingType)
    ) {
      query.fastingType = fastingType;
    }

    const students = await Student.find(query)
      .sort({ name: 1 })
      .select("name studentId batch department profileUrl fastingType");

    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

export const addStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department, fastingType } = req.body;

    // Validate required fields
    if (!name || !studentId || batch === undefined || !department) {
      return res.status(400).json({
        message: "Name, studentId, batch, and department are required",
      });
    }

    const batchNum = parseBatch(batch);
    if (batchNum === null) {
      return res.status(400).json({ message: "Batch must be a number" });
    }

    // Validate fastingType (optional but safe)
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
      batch: batchNum, // ✅ store batch as number
      department,
      fastingType: finalFastingType,
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
    if (batch !== undefined) {
      const batchNum = parseBatch(batch);
      if (batchNum === null) {
        return res.status(400).json({ message: "Batch must be a number" });
      }
      student.batch = batchNum;
    }

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

export const getCampusBatches = async (req, res) => {
  try {
    const campus = req.campus;
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const batches = await Student.distinct("batch", {
      campus: campus._id,
    });

    // Sort ascending
    const sortedBatches = batches.sort((a, b) => a - b);

    res.json({ batches: sortedBatches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch batches" });
  }
};

export const getStudentsByBatch = async (req, res) => {
  try {
    const campus = req.campus;
    const batchNum = parseBatch(req.params.batch);
    const search = req.query.search || "";
    const fastingType = req.query.fastingType;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (batchNum === null) {
      return res.status(400).json({ message: "Batch must be a number" });
    }

    const query = {
      campus: campus._id,
      batch: batchNum, // ✅ always use number
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting"].includes(fastingType)
    ) {
      query.fastingType = fastingType;
    }

    const students = await Student.find(query)
      .sort({ name: 1 })
      .select("name studentId batch department profileUrl fastingType");

    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

// ---------- Delete Student ----------
export const deleteStudent = async (req, res) => {
  try {
    // Find the student in this campus
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

    // Delete all StationScan records for this student in this campus
    await StationScan.deleteMany({
      student: student._id,
      campus: req.campus._id,
    });

    // Delete the student
    await student.deleteOne();

    res.json({
      message: "Student and related station scans deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete student" });
  }
};

// ---------- Delete All Students in a Batch ----------
export const deleteBatch = async (req, res) => {
  const { batch } = req.params;

  try {
    // Find all students in this batch for this campus
    const students = await Student.find({ batch, campus: req.campus._id });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this batch" });
    }

    // Delete photos from Cloudinary for each student
    for (const student of students) {
      if (student.profilePublicId) {
        try {
          const result = await cloudinary.uploader.destroy(
            student.profilePublicId,
          );
          if (result.result !== "ok" && result.result !== "not found") {
            console.warn(
              `Cloudinary deletion issue for ${student.name}: ${result.result}`,
            );
          }
        } catch (err) {
          console.error(`Cloudinary delete error for ${student.name}:`, err);
        }
      }
    }

    // Delete all StationScan records for these students in this campus
    const studentIds = students.map((s) => s._id);
    await StationScan.deleteMany({
      student: { $in: studentIds },
      campus: req.campus._id,
    });

    // Delete all students
    const result = await Student.deleteMany({
      _id: { $in: studentIds },
      campus: req.campus._id,
    });

    res.json({
      message: `Batch ${batch} and all related student data deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete batch" });
  }
};

// ---------- Bulk Delete Selected Students ----------
export const bulkDeleteStudents = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }

    // Find students belonging to this campus
    const students = await Student.find({
      _id: { $in: ids },
      campus: req.campus._id,
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "Students not found" });
    }

    // Delete Cloudinary images
    for (const student of students) {
      if (student.profilePublicId) {
        try {
          const result = await cloudinary.uploader.destroy(
            student.profilePublicId,
          );

          if (result.result !== "ok" && result.result !== "not found") {
            console.warn(
              `Cloudinary deletion issue for ${student.name}: ${result.result}`,
            );
          }
        } catch (err) {
          console.error(`Cloudinary delete error for ${student.name}:`, err);
        }
      }
    }

    const studentIds = students.map((s) => s._id);

    // Delete related StationScans
    await StationScan.deleteMany({
      student: { $in: studentIds },
      campus: req.campus._id,
    });

    // Delete students
    await Student.deleteMany({
      _id: { $in: studentIds },
      campus: req.campus._id,
    });

    res.json({
      message: "Selected students deleted successfully",
      deletedCount: studentIds.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Bulk delete failed" });
  }
};
