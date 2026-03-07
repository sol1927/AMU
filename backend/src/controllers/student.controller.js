import Student from "../models/student.model.js";
import cloudinary from "../config/cloudinary.js";
import StationScan from "../models/stationScan.model.js";
import { formatFullName } from "../utils/formatName.js";
import streamifier from "streamifier";
import Papa from "papaparse";
import XLSX from "xlsx";

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
  } catch {
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

    const batchStr = batch.toString().trim();
    if (!/^\d+$/.test(batchStr)) {
      return res.status(400).json({ message: "Batch must be a number" });
    }
    const batchNum = Number(batchStr);

    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({ message: "Student ID must be unique" });
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
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "students" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      profileUrl = result.secure_url;
      profilePublicId = result.public_id;
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let data = [];
    const filename = req.file.originalname.toLowerCase();

    if (filename.endsWith(".csv")) {
      const text = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        return res.status(400).json({
          message: "CSV parsing error",
          errors: parsed.errors,
        });
      }
      data = parsed.data;
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } else {
      return res.status(400).json({
        message: "Unsupported file type. Use CSV or Excel.",
      });
    }

    if (data.length === 0) {
      return res.status(400).json({ message: "File is empty" });
    }

    const campusId = req.campus._id;
    const requiredHeaders = ["name", "studentid", "batch", "department"];
    const headers = Object.keys(data[0]).map((h) => h.trim().toLowerCase());
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: "Missing required headers",
        missingHeaders,
      });
    }

    const studentsToInsert = [];
    const skippedRows = [];
    const fileIds = {};

    data.forEach((row, index) => {
      const normalizedRow = {};
      for (const key in row) {
        normalizedRow[key.trim().toLowerCase()] = row[key];
      }

      const { name, studentid, batch, department } = normalizedRow;
      const missingFields = [];

      if (!name) missingFields.push("name");
      if (!studentid) missingFields.push("studentId");
      if (!batch) missingFields.push("batch");
      if (!department) missingFields.push("department");

      if (missingFields.length > 0) {
        skippedRows.push({
          row: index + 2,
          error: `Missing fields: ${missingFields.join(", ")}`,
        });
        return;
      }

      const batchNum = Number(batch);
      if (Number.isNaN(batchNum)) {
        skippedRows.push({
          row: index + 2,
          error: "Batch must be a number",
        });
        return;
      }

      const id = studentid.trim();

      if (!fileIds[id]) fileIds[id] = [];
      fileIds[id].push(index + 2);

      studentsToInsert.push({
        name: name.trim(),
        studentId: id,
        batch: batchNum,
        department: department.trim(),
        campus: campusId,
        row: index + 2,
      });
    });

    Object.entries(fileIds).forEach(([id, rows]) => {
      if (rows.length > 1) {
        const rowText =
          rows.length === 2
            ? `Row ${rows[0]} and Row ${rows[1]}`
            : `Row ${rows.slice(0, -1).join(", ")}, and Row ${rows[rows.length - 1]}`;
        skippedRows.push({
          row: rows,
          error: `${rowText} have the same studentId (${id})`,
        });
      }
    });

    if (skippedRows.length > 0) {
      const preview = skippedRows
        .slice(0, 5)
        .map((r) =>
          Array.isArray(r.row) ? `${r.error}` : `Row ${r.row}: ${r.error}`,
        )
        .join("; ");
      const more =
        skippedRows.length > 5 ? `; ...and ${skippedRows.length - 5} more` : "";
      return res.status(400).json({
        message: `File contains ${skippedRows.length} error(s): ${preview}${more}`,
        skippedRows,
      });
    }

    const ids = studentsToInsert.map((s) => s.studentId);
    const existingStudents = await Student.find({ studentId: { $in: ids } })
      .select("studentId")
      .lean();
    const existingSet = new Set(existingStudents.map((s) => s.studentId));

    const finalStudents = [];
    const alreadyInDb = [];
    const newStudents = [];

    studentsToInsert.forEach((s) => {
      if (existingSet.has(s.studentId)) {
        alreadyInDb.push({
          row: s.row,
          studentId: s.studentId,
          error: `StudentId already exists (${s.studentId})`,
        });
      } else {
        newStudents.push(s);
      }
    });

    finalStudents.push(...newStudents);

    if (finalStudents.length === 0) {
      return res.status(400).json({
        message: `All ${alreadyInDb.length} students already exist in the database`,
        skippedRows: alreadyInDb,
      });
    }
    const studentsToInsertClean = finalStudents.map(({ row, ...rest }) => rest);
    const inserted = await Student.insertMany(studentsToInsertClean, {
      ordered: false,
    });
    res.json({
      message:
        `Successfully added ${inserted.length} student(s)` +
        (alreadyInDb.length > 0
          ? `; ${alreadyInDb.length} student(s) already existed in DB`
          : ""),
      students: inserted,
      skippedRows: alreadyInDb.length > 0 ? alreadyInDb : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload students" });
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
        await cloudinary.uploader.destroy(student.profilePublicId);
      } catch {
        // intentionally ignore errors, do not log anything
      }
    }

    student.profileUrl = req.file.path;
    student.profilePublicId = req.file.filename.replace(/\.[^.]+$/, "");

    await student.save();

    res.json({
      message: "Student photo updated",
      profileUrl: student.profileUrl,
    });
  } catch {
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
  } catch {
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
  } catch {
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
        await cloudinary.uploader.destroy(student.profilePublicId);
      } catch {
        // intentionally ignore errors
      }
    }
    await StationScan.deleteMany({
      student: student._id,
      campus: req.campus._id,
    });

    await student.deleteOne();

    res.json({
      message: "Student and related station scans deleted successfully",
    });
  } catch {
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

          if (result.result !== "ok" && result.result !== "not found") {
            // logger.warn("Cloudinary deletion returned unexpected result", { studentId: student._id, result });
          }
        } catch {
          // logger.error("Cloudinary deletion failed", { studentId: student._id, error: err });
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
  } catch {
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

          if (result.result !== "ok" && result.result !== "not found") {
            // Do nothing
          }
        } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    res.status(500).json({ message: "Bulk internship status update failed" });
  }
};
