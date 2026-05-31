import ExternalStudent from "../models/externalStudent.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import User from "../models/user.model.js";
// import { formatFullName } from "../utils/formatName.js";
// import Papa from "papaparse";
// import XLSX from "xlsx";
import { normalizeStudent } from "../utils/studentDefaults.js";
import { getStudentCampusQuery, parseCampusId } from "../utils/campusId.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";
import {
  buildCafeNumbers,
  filterStudentsForCafeNumber,
  getAssignedCafeNumberForBatch,
  getEffectiveStudentCafeNumber,
  normalizeBatchCafeAssignments,
  normalizeCafeCount,
} from "../utils/cafeScope.js";

const parseBatch = (input) => {
  const batch = Number(input);
  if (Number.isNaN(batch)) return null;
  return batch;
};

const matchesSearch = (student, search) => {
  if (!search) return true;
  const value = search.toLowerCase();
  return [student.name, student.studentId, student.department]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(value));
};

const byName = (left, right) =>
  String(left.name || "").localeCompare(String(right.name || ""));

const mapStudentWithEffectiveCafe = (student, campus) => {
  if (!student) return student;
  const normalized = normalizeStudent(student);
  normalized.effectiveCafeNumber = getEffectiveStudentCafeNumber(
    student,
    campus,
  );
  return normalized;
};

const hasSyncChanges = (existingStudent, sourceStudent) =>
  String(existingStudent.name || "") !== String(sourceStudent.name || "") ||
  Number(existingStudent.batch) !== Number(sourceStudent.batch) ||
  String(existingStudent.department || "") !==
    String(sourceStudent.department || "") ||
  String(existingStudent.profileUrl || "") !==
    String(sourceStudent.profileUrl || "") ||
  Number(existingStudent.campusId) !== Number(sourceStudent.campusId);

const findUniversityCafeStudents = async (campusId) =>
  ExternalStudent.findAll({ campusId });

const logStudentSyncSourceError = (message, code = "SYNC_SOURCE_ERROR") => {
  logInternalError("sync-cafe-students", {
    code,
    logMessage: message,
    omitCodeInLog: true,
    omitNameInLog: true,
  });
};

const getStudentSyncUserMessage = (error) => {
  if (error?.code === "ER_BAD_DB_ERROR") {
    return "The student source database was not found. Please check the sync settings.";
  }

  if (error?.code === "ER_NO_SUCH_TABLE") {
    return "The student source table was not found. Please check the sync settings.";
  }

  if (error?.code === "ER_ACCESS_DENIED_ERROR") {
    return "The student source login details are not correct. Please check the sync settings.";
  }

  if (
    error?.message?.startsWith(
      "External student DB is not configured. Missing:",
    )
  ) {
    return "Student sync settings are incomplete. Please update them and try again.";
  }

  return "We could not fetch students right now. Please try again.";
};

const resolveScopedCampusBase = async (req) => {
  if (req.campus) {
    return req.campus;
  }

  const campusRecordId = req.params.id || req.params.campusId;
  if (!campusRecordId) {
    if (
      req.userRole === "cafe" ||
      req.userRole === "cafe manager" ||
      req.userRole === "campus"
    ) {
      const loggedInUser = await User.findById(req.userId);
      if (!loggedInUser) return null;
      const targetId =
        req.userRole === "campus" ? loggedInUser.id : loggedInUser.campusId;
      const campus = await User.findById(targetId);
      if (campus?.role === "campus") return campus;
      return User.findOne({ campusId: loggedInUser.campusId, role: "campus" });
    }
    return null;
  }

  if (req.userRole === "admin") {
    const campus = await User.findById(campusRecordId);
    if (
      !campus ||
      campus.role !== "campus" ||
      Number(campus.createdBy) !== Number(req.userId)
    ) {
      return null;
    }
    return campus;
  }

  if (
    req.userRole === "cafe" ||
    req.userRole === "cafe manager"
  ) {
    const loggedInUser = await User.findById(req.userId);
    if (
      !loggedInUser ||
      Number(loggedInUser.campusId) !== Number(campusRecordId)
    ) {
      return null;
    }
    const campus = await User.findById(loggedInUser.campusId);
    if (campus?.role === "campus") return campus;
    return User.findOne({ campusId: loggedInUser.campusId, role: "campus" });
  }

  return null;
};

const resolveScopedCampus = async (req) => {
  const campus = await resolveScopedCampusBase(req);
  if (campus) {
    const registeredCafes = await User.findAll({
      campusId: campus.campusId || campus.id,
      role: "cafe",
    });
    const matchNums = registeredCafes.map((c) => {
      const match = String(c.name || "").match(/\d+/);
      return match ? Number(match[0]) : 0;
    });
    campus.cafeCount = Math.max(
      campus.cafeCount || 0,
      registeredCafes.length,
      ...matchNums
    );
  }
  return campus;
};

export const getCampusStudents = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    const search = req.query.search || "";
    const fastingType = req.query.fastingType;
    const batch = parseBatch(req.query.batch);
    const department = req.query.department || "";

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    let students = await CafeStudent.findAll(getStudentCampusQuery(campus));

    // Only filter by cafe number if the user is a cafe (not campus or cafe manager)
    if (req.userRole === "cafe") {
      const cafeNumber =
        req.cafeNumber ||
        (req.query.cafeNumber ? Number(req.query.cafeNumber) : null);
      students = cafeNumber
        ? filterStudentsForCafeNumber(students, campus, cafeNumber)
        : [];
    }
    // Cafe manager and campus see all students (no filter)

    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"].includes(
        fastingType,
      )
    ) {
      students = students.filter(
        (student) => student.fastingType === fastingType,
      );
    }

    if (batch !== null) {
      students = students.filter((student) => Number(student.batch) === batch);
    }

    if (department) {
      const normalizedDepartment = department.toLowerCase().trim();
      students = students.filter(
        (student) =>
          String(student.department || "")
            .toLowerCase()
            .trim() === normalizedDepartment,
      );
    }

    students = students
      .filter((student) => matchesSearch(student, search))
      .sort(byName);
    const totalStudents = students.length;

    res.json({
      students: students.map((student) =>
        mapStudentWithEffectiveCafe(student, campus),
      ),
      totalStudents,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

export const getCampusStudentsAll = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    const search = req.query.search || "";
    const fastingType = req.query.fastingType;
    const cafeNumber = req.query.cafeNumber
      ? Number(req.query.cafeNumber)
      : null;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    let students = await CafeStudent.findAll(getStudentCampusQuery(campus));

    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"].includes(
        fastingType,
      )
    ) {
      students = students.filter(
        (student) => student.fastingType === fastingType,
      );
    }

    if (Number.isInteger(cafeNumber) && cafeNumber > 0) {
      students = filterStudentsForCafeNumber(students, campus, cafeNumber);
    }

    students = students
      .filter((student) => matchesSearch(student, search))
      .sort(byName);

    const cafeTotals = buildCafeNumbers(campus?.cafeCount).reduce(
      (totals, number) => ({
        ...totals,
        [number]: 0,
      }),
      {},
    );

    students.forEach((student) => {
      const effectiveCafe = getEffectiveStudentCafeNumber(student, campus);
      if (Number.isInteger(effectiveCafe) && effectiveCafe > 0) {
        cafeTotals[effectiveCafe] = (cafeTotals[effectiveCafe] || 0) + 1;
      }
    });

    res.json({
      students: students.map((student) =>
        mapStudentWithEffectiveCafe(student, campus),
      ),
      totalStudents: students.length,
      cafeTotals,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch all campus students" });
  }
};

/*
export const addStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department, fastingType } = req.body;
    const campusId = parseCampusId(req.campus?.campusId);

    if (!name || !studentId || batch === undefined || !department) {
      return res.status(400).json({
        message: "Name, studentId, batch, and department are required",
      });
    }

    if (campusId === null) {
      return res.status(400).json({
        message: "Campus ID is not set for this campus. Ask the admin to add it first.",
      });
    }

    const batchStr = batch.toString().trim();
    if (!/^\d+$/.test(batchStr)) {
      return res.status(400).json({ message: "Batch must be a number" });
    }
    const batchNum = Number(batchStr);

    const existingStudent = await CafeStudent.findOne({ studentId });
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

    const profileUrl =
      typeof req.body.profileUrl === "string" ? req.body.profileUrl.trim() : "";

    const student = await CafeStudent.create({
      name: formatFullName(name),
      studentId,
      batch: batchNum,
      department: formatFullName(department),
      fastingType: finalFastingType,
      profileUrl,
      campusId,
    });

    res.status(201).json({ message: "Student added", student });
  } catch (error) {
    logInternalError("add-student", error);
    sendServerError(res, "We could not add the student. Please try again.");
  }
};
*/

/*
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

    const campusId = parseCampusId(req.campus?.campusId);
    if (campusId === null) {
      return res.status(400).json({
        message: "Campus ID is not set for this campus. Ask the admin to add it first.",
      });
    }

    const requiredHeaders = ["name", "studentid", "batch", "department"];
    const headers = Object.keys(data[0]).map((header) => header.trim().toLowerCase());
    const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

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
        name: formatFullName(name.trim()),
        studentId: id,
        batch: batchNum,
        department: formatFullName(department.trim()),
        campusId,
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
        .map((row) =>
          Array.isArray(row.row) ? `${row.error}` : `Row ${row.row}: ${row.error}`,
        )
        .join("; ");
      const more =
        skippedRows.length > 5 ? `; ...and ${skippedRows.length - 5} more` : "";
      return res.status(400).json({
        message: `File contains ${skippedRows.length} error(s): ${preview}${more}`,
        skippedRows,
      });
    }

    const ids = studentsToInsert.map((student) => student.studentId);
    const existingStudents = await CafeStudent.findAll({ studentIds: ids });
    const existingSet = new Set(existingStudents.map((student) => student.studentId));

    const alreadyInDb = [];
    const finalStudents = studentsToInsert.filter((student) => {
      if (existingSet.has(student.studentId)) {
        alreadyInDb.push({
          row: student.row,
          studentId: student.studentId,
          error: `StudentId already exists (${student.studentId})`,
        });
        return false;
      }
      return true;
    });

    if (finalStudents.length === 0) {
      return res.status(400).json({
        message: `All ${alreadyInDb.length} students already exist in the database`,
        skippedRows: alreadyInDb,
      });
    }

    const inserted = await CafeStudent.insertMany(
      finalStudents.map((student) => ({
        name: student.name,
        studentId: student.studentId,
        batch: student.batch,
        department: student.department,
        campusId: student.campusId,
      })),
    );

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
    logInternalError("bulk-upload-students", err);
    sendServerError(
      res,
      "We could not upload the student file. Please try again.",
    );
  }
};
*/

/*
export const updateStudent = async (req, res) => {
  try {
    const { name, studentId, batch, department, fastingType } = req.body;

    const student = await CafeStudent.findById(req.params.id);
    if (!student || Number(student.campusId) !== Number(req.campus.campusId)) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updates = {};
    if (name) updates.name = formatFullName(name);
    if (studentId) updates.studentId = studentId;
    if (batch !== undefined) {
      const batchNum = parseBatch(batch);
      if (batchNum === null) {
        return res.status(400).json({ message: "Batch must be a number" });
      }
      updates.batch = batchNum;
    }
    if (department) updates.department = formatFullName(department);
    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"].includes(
        fastingType,
      )
    ) {
      updates.fastingType = fastingType;
    }

    const updatedStudent = await CafeStudent.updateById(student.id, updates);

    res.json({
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch {
    res.status(500).json({ message: "Failed to update student" });
  }
};
*/

/*
export const updateStudentPhoto = async (req, res) => {
  try {
    const { profileUrl } = req.body;
    if (!profileUrl || typeof profileUrl !== "string") {
      return res.status(400).json({ message: "Profile URL is required" });
    }

    const student = await CafeStudent.findById(req.params.id);
    if (!student || Number(student.campusId) !== Number(req.campus.campusId)) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updatedStudent = await CafeStudent.updateById(student.id, {
      profileUrl: profileUrl.trim(),
    });

    res.json({
      message: "Student photo updated",
      profileUrl: updatedStudent.profileUrl,
    });
  } catch {
    res.status(500).json({ message: "Failed to update photo" });
  }
};
*/

export const getCampusBatches = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    let students = await CafeStudent.findAll(getStudentCampusQuery(campus));
    if (req.userRole === "cafe") {
      const cafeNumber = req.cafeNumber;
      students = cafeNumber
        ? filterStudentsForCafeNumber(students, campus, cafeNumber)
        : [];
    }

    const batchMap = students.reduce((accumulator, student) => {
      const batchValue = Number(student.batch);
      if (Number.isNaN(batchValue)) {
        return accumulator;
      }

      const batchKey = String(batchValue);
      if (!accumulator.has(batchKey)) {
        accumulator.set(batchKey, {
          batch: batchValue,
          studentCount: 0,
          assignedCafeNumber: getAssignedCafeNumberForBatch(campus, batchValue),
        });
      }

      accumulator.get(batchKey).studentCount += 1;
      return accumulator;
    }, new Map());

    if (
      campus?.batchCafeAssignments &&
      typeof campus.batchCafeAssignments === "object" &&
      !Array.isArray(campus.batchCafeAssignments)
    ) {
      Object.keys(campus.batchCafeAssignments).forEach((batchKey) => {
        const batchValue = Number(batchKey);
        if (Number.isNaN(batchValue)) {
          return;
        }

        if (!batchMap.has(String(batchValue))) {
          batchMap.set(String(batchValue), {
            batch: batchValue,
            studentCount: 0,
            assignedCafeNumber: getAssignedCafeNumberForBatch(
              campus,
              batchValue,
            ),
          });
        }
      });
    }

    const batches = Array.from(batchMap.values()).sort(
      (a, b) => a.batch - b.batch,
    );
    res.json({
      batches,
      cafeNumbers: buildCafeNumbers(campus.cafeCount),
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch batches" });
  }
};

export const getStudentsByBatch = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    const batchNum = parseBatch(req.params.batch);
    const search = req.query.search || "";
    const fastingType = req.query.fastingType;
    const department = req.query.department || "";

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (batchNum === null) {
      return res.status(400).json({ message: "Batch must be a number" });
    }

    let students = await CafeStudent.findAll({
      ...getStudentCampusQuery(campus),
      batch: batchNum,
    });
    if (req.userRole === "cafe") {
      const cafeNumber = req.cafeNumber;
      students = cafeNumber
        ? filterStudentsForCafeNumber(students, campus, cafeNumber)
        : [];
    }

    if (
      fastingType &&
      ["not_fasting", "fasting", "sunday_fasting", "muslim_fasting"].includes(
        fastingType,
      )
    ) {
      students = students.filter(
        (student) => student.fastingType === fastingType,
      );
    }

    if (department) {
      const normalizedDepartment = department.toLowerCase().trim();
      students = students.filter(
        (student) =>
          String(student.department || "")
            .toLowerCase()
            .trim() === normalizedDepartment,
      );
    }

    students = students
      .filter((student) => matchesSearch(student, search))
      .sort(byName);
    res.json({
      students: students.map((student) =>
        mapStudentWithEffectiveCafe(student, campus),
      ),
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

export const assignBatchToCafeNumber = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const campus = await User.findById(req.params.id);
    if (
      !campus ||
      campus.role !== "campus" ||
      Number(campus.createdBy) !== Number(req.userId)
    ) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const batchNum = parseBatch(req.params.batch);
    const cafeNumber = Number(req.body?.cafeNumber);
    const availableCafeNumbers = buildCafeNumbers(campus.cafeCount);

    if (batchNum === null) {
      return res.status(400).json({ message: "Batch must be a number" });
    }

    if (cafeNumber !== 0 && !availableCafeNumbers.includes(cafeNumber)) {
      return res.status(400).json({
        message: "Please choose a valid cafe number for this campus.",
      });
    }

    const students = await CafeStudent.findAll({
      ...getStudentCampusQuery(campus),
      batch: batchNum,
    });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this batch" });
    }

    const nextAssignments = normalizeBatchCafeAssignments(
      {
        ...(campus.batchCafeAssignments || {}),
        [String(batchNum)]: cafeNumber,
      },
      normalizeCafeCount(campus.cafeCount),
    );

    const updatedCampus = await User.updateById(campus.id, {
      batchCafeAssignments: nextAssignments,
      cafeCount: campus.cafeCount,
    });

    return res.json({
      message: `Batch ${batchNum} now serves at Cafe ${cafeNumber}.`,
      batch: batchNum,
      assignedCafeNumber: cafeNumber,
      batchCafeAssignments:
        updatedCampus.batchCafeAssignments || nextAssignments,
    });
  } catch (err) {
    logInternalError("assign-batch-to-cafe-number", err);
    sendServerError(
      res,
      "We could not save that cafe number right now. Please try again.",
    );
  }
};

export const updateStudentCafeNumber = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const student = await CafeStudent.findById(req.params.id);
    if (!student || Number(student.campusId) !== Number(campus.campusId)) {
      return res.status(404).json({ message: "Student not found" });
    }

    const availableCafeNumbers = buildCafeNumbers(campus.cafeCount);
    const requestedCafeNumber = req.body?.cafeNumber;

    if (requestedCafeNumber !== null && requestedCafeNumber !== undefined) {
      const cafeNumber = Number(requestedCafeNumber);
      if (cafeNumber !== 0 && !availableCafeNumbers.includes(cafeNumber)) {
        return res.status(400).json({
          message: "Please choose a valid cafe number for this campus.",
        });
      }

      const updatedStudent = await CafeStudent.updateById(student.id, {
        cafeNumber,
      });

      return res.json({
        message: `Student assigned to Cafe ${cafeNumber} successfully.`,
        student: mapStudentWithEffectiveCafe(updatedStudent, campus),
      });
    }

    const updatedStudent = await CafeStudent.updateById(student.id, {
      cafeNumber: 0,
    });

    return res.json({
      message: "Student cafe assignment cleared successfully.",
      student: mapStudentWithEffectiveCafe(updatedStudent, campus),
    });
  } catch (err) {
    logInternalError("update-student-cafe-number", err);
    sendServerError(
      res,
      "We could not update that student assignment right now. Please try again.",
    );
  }
};

export const bulkUpdateStudentCafeNumbers = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    const { ids } = req.body;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }

    const availableCafeNumbers = buildCafeNumbers(campus.cafeCount);
    const requestedCafeNumber = req.body?.cafeNumber;
    let cafeNumber = 0;

    if (requestedCafeNumber !== null && requestedCafeNumber !== undefined) {
      cafeNumber = Number(requestedCafeNumber);
      if (cafeNumber !== 0 && !availableCafeNumbers.includes(cafeNumber)) {
        return res.status(400).json({
          message: "Please choose a valid cafe number for this campus.",
        });
      }
    }

    const result = await CafeStudent.updateMany(
      { ids, ...getStudentCampusQuery(campus) },
      { cafeNumber },
    );

    return res.json({
      message:
        cafeNumber === 0
          ? `Cleared cafe assignment for ${result.modifiedCount} students.`
          : `Assigned ${result.modifiedCount} students to Cafe ${cafeNumber}.`,
      modifiedCount: result.modifiedCount,
      cafeNumber,
    });
  } catch (err) {
    logInternalError("bulk-update-student-cafe-number", err);
    sendServerError(
      res,
      "We could not update those student assignments right now. Please try again.",
    );
  }
};

/*
export const deleteStudent = async (req, res) => {
  try {
    const student = await CafeStudent.findById(req.params.id);
    if (!student || Number(student.campusId) !== Number(req.campus.campusId)) {
      return res.status(404).json({ message: "Student not found" });
    }

    await StationScan.deleteMany({
      student: student.id,
      campus: req.campus.id,
    });
    await CafeStudent.deleteById(student.id);

    res.json({
      message: "Student and related station scans deleted successfully",
    });
  } catch {
    res.status(500).json({ message: "Failed to delete student" });
  }
};
*/

/*
export const deleteBatch = async (req, res) => {
  const batch = parseBatch(req.params.batch);

  try {
    const students = await CafeStudent.findAll({
      ...getStudentCampusQuery(req.campus),
      batch,
    });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this batch" });
    }

    const studentIds = students.map((student) => student.id);
    await StationScan.deleteMany({
      students: studentIds,
      campus: req.campus.id,
    });

    const result = await CafeStudent.deleteMany({
      ids: studentIds,
      ...getStudentCampusQuery(req.campus),
    });

    res.json({
      message: `Batch ${batch} and all related student data deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch {
    res.status(500).json({ message: "Failed to delete batch" });
  }
};
*/

/*
export const bulkDeleteStudents = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }

    const students = await CafeStudent.findAll({
      ids,
      ...getStudentCampusQuery(req.campus),
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "Students not found" });
    }

    const studentIds = students.map((student) => student.id);
    await StationScan.deleteMany({
      students: studentIds,
      campus: req.campus.id,
    });
    await CafeStudent.deleteMany({
      ids: studentIds,
      ...getStudentCampusQuery(req.campus),
    });

    res.json({
      message: "Selected students deleted successfully",
      deletedCount: studentIds.length,
    });
  } catch {
    res.status(500).json({ message: "Bulk delete failed" });
  }
};
*/

export const bulkUpdateFasting = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    const { ids, fastingType } = req.body;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

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

    const result = await CafeStudent.updateMany(
      { ids, ...getStudentCampusQuery(campus) },
      { fastingType },
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
    const campus = await resolveScopedCampus(req);
    const { isInternship } = req.body;
    if (typeof isInternship !== "boolean") {
      return res.status(400).json({ message: "isInternship must be boolean" });
    }

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const student = await CafeStudent.findById(req.params.id);
    if (!student || Number(student.campusId) !== Number(campus.campusId)) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updatedStudent = await CafeStudent.updateById(student.id, {
      isInternship,
    });

    res.json({
      message: `Student ${isInternship ? "marked as internship" : "marked as not internship"} successfully`,
      student: updatedStudent,
    });
  } catch {
    res.status(500).json({ message: "Failed to update internship status" });
  }
};

export const bulkToggleInternshipStudents = async (req, res) => {
  try {
    const campus = await resolveScopedCampus(req);
    const { ids, isInternship } = req.body;

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }
    if (typeof isInternship !== "boolean") {
      return res.status(400).json({ message: "isInternship must be boolean" });
    }

    const result = await CafeStudent.updateMany(
      { ids, ...getStudentCampusQuery(campus) },
      { isInternship },
    );

    res.json({
      message: `${isInternship ? "Marked as internship" : "Marked as not internship"} ${result.modifiedCount} students`,
      modifiedCount: result.modifiedCount,
    });
  } catch {
    res.status(500).json({ message: "Bulk internship status update failed" });
  }
};

export const syncCafeStudents = async (req, res) => {
  try {
    let campus = null;

    if (req.userRole === "campus") {
      // For campus role, req.userId is their own campus user ID
      campus = await User.findById(req.userId);
      if (!campus || campus.role !== "campus") {
        return res.status(404).json({ message: "Campus not found" });
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const campusId = parseCampusId(campus.campusId);
    if (campusId === null) {
      return res.status(400).json({
        message:
          "Campus ID is not set for this campus. Ask the admin to add it first.",
      });
    }

    let universityStudents = [];
    try {
      universityStudents = await findUniversityCafeStudents(campusId);
    } catch (error) {
      if (error?.code === "ER_BAD_DB_ERROR") {
        logStudentSyncSourceError(error.message, "SYNC_EXTERNAL_DB_MISSING");
        return res.status(404).json({
          message:
            "The student source database was not found. Please check the sync settings.",
        });
      }

      if (error?.code === "ER_NO_SUCH_TABLE") {
        logStudentSyncSourceError(error.message, "SYNC_EXTERNAL_TABLE_MISSING");
        return res.status(404).json({
          message:
            "The student source table was not found. Please check the sync settings.",
        });
      }

      if (error?.code === "ER_ACCESS_DENIED_ERROR") {
        logStudentSyncSourceError(error.message, "SYNC_EXTERNAL_LOGIN_FAILED");
        return res.status(401).json({
          message:
            "The student source login details are not correct. Please check the sync settings.",
        });
      }

      throw error;
    }

    if (universityStudents.length === 0) {
      const existingCampusCafeStudents = await CafeStudent.findAll({
        campusId,
      });
      if (existingCampusCafeStudents.length > 0) {
        await CafeStudent.deleteMany({ campusId });
      }

      const currentCafeStudentCount = await CafeStudent.countDocuments({
        campusId,
      });
      return res.json({
        message: "No students were found in the university database.",
        syncedCount: 0,
        updatedCount: 0,
        removedCount: existingCampusCafeStudents.length,
        skippedCount: 0,
        totalCafeStudents: 0,
        currentCafeStudentCount,
      });
    }

    const normalizedUniversityStudents = universityStudents
      .map((student) => ({
        ...student,
        studentId:
          typeof student.studentId === "string"
            ? student.studentId.trim()
            : String(student.studentId ?? "").trim(),
      }))
      .filter((student) => student.studentId);

    const studentIds = normalizedUniversityStudents.map(
      (student) => student.studentId,
    );
    const existingCampusCafeStudents = await CafeStudent.findAll({ campusId });
    const existingStudentMap = new Map(
      existingCampusCafeStudents.map((student) => [
        String(student.studentId).trim(),
        student,
      ]),
    );
    const queuedStudentIds = new Set();
    const sourceStudentIds = new Set(studentIds);
    let updatedCount = 0;

    const studentsToInsert = normalizedUniversityStudents.reduce(
      (accumulator, student) => {
        if (queuedStudentIds.has(student.studentId)) {
          return accumulator;
        }

        queuedStudentIds.add(student.studentId);

        const existingStudent = existingStudentMap.get(student.studentId);
        if (existingStudent) {
          return accumulator;
        }

        accumulator.push({
          name: student.name,
          studentId: student.studentId,
          batch: student.batch,
          department: student.department,
          profileUrl: student.profileUrl || "",
          fastingType: student.fastingType || "not_fasting",
          isInternship: student.isInternship === true,
          campusId: student.campusId,
        });
        return accumulator;
      },
      [],
    );

    const studentsToUpdate = normalizedUniversityStudents.filter((student) => {
      const existingStudent = existingStudentMap.get(student.studentId);
      return existingStudent && hasSyncChanges(existingStudent, student);
    });

    updatedCount = studentsToUpdate.length;

    await Promise.all(
      studentsToUpdate.map(async (student) => {
        const existingStudent = existingStudentMap.get(student.studentId);
        await CafeStudent.updateById(existingStudent.id, {
          name: student.name,
          batch: student.batch,
          department: student.department,
          profileUrl: student.profileUrl || "",
          campusId: student.campusId,
        });
      }),
    );

    if (studentsToInsert.length > 0) {
      await CafeStudent.insertMany(studentsToInsert);
    }

    const studentsToDeactivate = existingCampusCafeStudents.filter(
      (student) => !sourceStudentIds.has(String(student.studentId).trim()),
    );

    if (studentsToDeactivate.length > 0) {
      await CafeStudent.deleteMany({
        ids: studentsToDeactivate.map((student) => student.id),
      });
    }

    const skippedCount =
      normalizedUniversityStudents.length -
      studentsToInsert.length -
      updatedCount;
    const currentCafeStudentCount = await CafeStudent.countDocuments({
      campusId,
    });
    const removedCount = studentsToDeactivate.length;

    return res.json({
      message: `Students synced. Added ${studentsToInsert.length}, updated ${updatedCount}, removed ${removedCount}.`,
      syncedCount: studentsToInsert.length,
      updatedCount,
      removedCount,
      skippedCount,
      totalCafeStudents: normalizedUniversityStudents.length,
      currentCafeStudentCount,
    });
  } catch (err) {
    logInternalError("sync-cafe-students", err);
    sendServerError(res, getStudentSyncUserMessage(err));
  }
};
