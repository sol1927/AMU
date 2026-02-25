import Campus from "../models/campus.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Student from "../models/student.model.js";
import cloudinary from "../config/cloudinary.js";
import upload from "../middlewares/upload.js";
import StationScan from "../models/stationScan.model.js";
import { formatFullName } from "../utils/formatName.js";

const parseBatch = (input) => {
  const batch = Number(input);
  if (Number.isNaN(batch)) return null;
  return batch;
};

export const getCampusStudents = async (req, res) => {
  try {
    const campus = req.campus;
    const search = req.query.search || "";
    const fastingType = req.query.fastingType;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const query = {
      campus: campus._id,
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
      ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"].includes(
        fastingType,
      )
    ) {
      query.fastingType = fastingType;
    }

    const students = await Student.find(query)
      .sort({ name: 1 })
      .select(
        "name studentId batch department profileUrl fastingType isInternship",
      );

    const totalStudents = await Student.countDocuments({ campus: campus._id });

    res.json({
      students,
      totalStudents,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

export const addStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department, fastingType } = req.body;

    if (!name || !studentId || batch === undefined || !department) {
      return res.status(400).json({
        message: "Name, studentId, batch, and department are required",
      });
    }

    const batchNum = parseBatch(batch);
    if (batchNum === null) {
      return res.status(400).json({ message: "Batch must be a number" });
    }

    const allowedFastingTypes = [
      "not_fasting",
      "fasting",
      "sunday_fasting",
      "muslim_fasting",
    ];
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
      name: formatFullName(name),
      studentId,
      batch: batchNum,
      department: formatFullName(department),
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

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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

    if (name) student.name = formatFullName(name);
    if (studentId) student.studentId = studentId;
    if (batch !== undefined) {
      const batchNum = parseBatch(batch);
      if (batchNum === null) {
        return res.status(400).json({ message: "Batch must be a number" });
      }
      student.batch = batchNum;
    }

    if (department) student.department = formatFullName(department);
    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"].includes(
        fastingType,
      )
    ) {
      student.fastingType = fastingType;
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
    res.status(500).json({ message: "Failed to update student" });
  }
};

export const updateStudentPhoto = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No image received" });

    const student = await Student.findOne({
      _id: req.params.id,
      campus: req.campus._id,
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (student.profilePublicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          student.profilePublicId,
        );
        if (result.result !== "ok" && result.result !== "not found") {
        }
      } catch (err) {}
    }

    student.profileUrl = req.file.path;
    student.profilePublicId = req.file.filename.replace(/\.[^.]+$/, "");

    await student.save();

    res.json({
      message: "Student photo updated",
      profileUrl: student.profileUrl,
    });
  } catch (err) {
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

    const sortedBatches = batches.sort((a, b) => a - b);

    res.json({ batches: sortedBatches });
  } catch (error) {
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
      batch: batchNum,
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
      .select(
        "name studentId batch department profileUrl fastingType isInternship",
      );

    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      campus: req.campus._id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.profilePublicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          student.profilePublicId,
        );
        if (result.result !== "ok" && result.result !== "not found") {
        }
      } catch (err) {}
    }
    await StationScan.deleteMany({
      student: student._id,
      campus: req.campus._id,
    });

    await student.deleteOne();

    res.json({
      message: "Student and related station scans deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete student" });
  }
};

export const deleteBatch = async (req, res) => {
  const { batch } = req.params;

  try {
    const students = await Student.find({ batch, campus: req.campus._id });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this batch" });
    }

    for (const student of students) {
      if (student.profilePublicId) {
        try {
          const result = await cloudinary.uploader.destroy(
            student.profilePublicId,
          );

          // Optional: check for unexpected result, but do NOT log sensitive info
          if (result.result !== "ok" && result.result !== "not found") {
            // Use internal logger if available; only track ID, not name/email
            // logger.warn("Cloudinary deletion returned unexpected result", { studentId: student._id, result });
          }
        } catch (err) {
          // Use logger for internal tracking instead of console.error
          // logger.error("Cloudinary deletion failed", { studentId: student._id, error: err });
          // If you don't have a logger yet, safely ignore or keep minimal info:
          // console.error("Cloudinary deletion failed for a student"); // no sensitive info
        }
      }
    }

    const studentIds = students.map((s) => s._id);
    await StationScan.deleteMany({
      student: { $in: studentIds },
      campus: req.campus._id,
    });

    const result = await Student.deleteMany({
      _id: { $in: studentIds },
      campus: req.campus._id,
    });

    res.json({
      message: `Batch ${batch} and all related student data deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete batch" });
  }
};

export const bulkDeleteStudents = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }

    const students = await Student.find({
      _id: { $in: ids },
      campus: req.campus._id,
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "Students not found" });
    }

    for (const student of students) {
      if (student.profilePublicId) {
        try {
          const result = await cloudinary.uploader.destroy(
            student.profilePublicId,
          );

          // Optional: check for unexpected result
          if (result.result !== "ok" && result.result !== "not found") {
            // Use a logger for internal tracking (student ID only, no name/email)
            // logger.warn("Cloudinary deletion returned unexpected result", { studentId: student._id, result });
            // If no logger yet, leave empty to avoid leaking info
            // Do nothing
          }
        } catch (err) {
          // Production-safe: do not print raw error or student info
          // logger.error("Cloudinary deletion failed", { studentId: student._id, error: err });
          // Or safely ignore if you don't want logging
          // Do nothing
        }
      }
    }

    const studentIds = students.map((s) => s._id);

    await StationScan.deleteMany({
      student: { $in: studentIds },
      campus: req.campus._id,
    });

    await Student.deleteMany({
      _id: { $in: studentIds },
      campus: req.campus._id,
    });

    res.json({
      message: "Selected students deleted successfully",
      deletedCount: studentIds.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Bulk delete failed" });
  }
};

export const bulkUpdateFasting = async (req, res) => {
  try {
    const { ids, fastingType } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }

    const allowedFastingTypes = [
      "not_fasting",
      "fasting",
      "sunday_fasting",
      "muslim_fasting",
    ];

    if (!fastingType || !allowedFastingTypes.includes(fastingType)) {
      return res.status(400).json({ message: "Invalid fasting type" });
    }

    const result = await Student.updateMany(
      { _id: { $in: ids }, campus: req.campus._id },
      { $set: { fastingType } },
    );

    res.json({
      message: `Updated fasting status for ${result.modifiedCount} students`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Bulk update failed" });
  }
};

export const toggleInternshipStudent = async (req, res) => {
  try {
    const { isInternship } = req.body;
    if (typeof isInternship !== "boolean") {
      return res.status(400).json({ message: "isInternship must be boolean" });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      campus: req.campus._id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.isInternship = isInternship;
    await student.save();

    res.json({
      message: `Student ${isInternship ? "marked as internship" : "marked as not internship"} successfully`,
      student,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update internship status" });
  }
};

export const bulkToggleInternshipStudents = async (req, res) => {
  try {
    const { ids, isInternship } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }
    if (typeof isInternship !== "boolean") {
      return res.status(400).json({ message: "isInternship must be boolean" });
    }

    const result = await Student.updateMany(
      { _id: { $in: ids }, campus: req.campus._id },
      { $set: { isInternship } },
    );

    res.json({
      message: `${isInternship ? "Marked as internship" : "Marked as not internship"} ${result.modifiedCount} students`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Bulk internship status update failed" });
  }
};
