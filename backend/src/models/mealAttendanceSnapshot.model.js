import { getDB } from "../config/db.js";
import { mapRows, normalizeDate, parseJsonField } from "./modelUtils.js";

const mapSnapshotRow = (row) => ({
  ...row,
  studentDetails: parseJsonField(row.studentDetails, null)
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS meal_attendance_snapshots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      studentId VARCHAR(255) NOT NULL,
      studentDetails JSON NOT NULL,
      fastingType VARCHAR(50) NOT NULL,
      campusId INT NOT NULL,
      cafeteria INT DEFAULT NULL,
      mealSession VARCHAR(50) NOT NULL,
      sessionStartTime VARCHAR(5) NOT NULL,
      sessionEndTime VARCHAR(5) NOT NULL,
      attendanceDate DATE NOT NULL,
      scanTimestamp DATETIME NOT NULL,
      appliedSessionConfigId INT DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (campusId) REFERENCES users(id),
      UNIQUE KEY unique_student_session_date (studentId, campusId, attendanceDate, mealSession)
    );
  `;
  await getDB().execute(query);
};

const create = async (data) => {
  const {
    studentId,
    studentDetails,
    fastingType,
    campusId,
    cafeteria = null,
    mealSession,
    sessionStartTime,
    sessionEndTime,
    attendanceDate,
    scanTimestamp = new Date(),
    appliedSessionConfigId = null
  } = data;
  const query = `
    INSERT INTO meal_attendance_snapshots (studentId, studentDetails, fastingType, campusId, cafeteria, mealSession, sessionStartTime, sessionEndTime, attendanceDate, scanTimestamp, appliedSessionConfigId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    studentId,
    JSON.stringify(studentDetails),
    fastingType,
    campusId,
    cafeteria,
    mealSession,
    sessionStartTime,
    sessionEndTime,
    attendanceDate,
    normalizeDate(scanTimestamp),
    appliedSessionConfigId
  ];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM meal_attendance_snapshots WHERE 1=1";
  const params = [];
  if (filter.campusId) {
    query += " AND campusId = ?";
    params.push(filter.campusId);
  }
  if (filter.attendanceDate) {
    query += " AND attendanceDate = ?";
    params.push(filter.attendanceDate);
  }
  if (filter.startDate && filter.endDate) {
    query += " AND attendanceDate >= ? AND attendanceDate <= ?";
    params.push(filter.startDate, filter.endDate);
  }
  if (filter.cafeteria) {
    query += " AND cafeteria = ?";
    params.push(filter.cafeteria);
  }
  if (filter.mealSession) {
    query += " AND mealSession = ?";
    params.push(filter.mealSession);
  }
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows, mapSnapshotRow);
};

const findMinDate = async (campusId) => {
  const query = `
    SELECT MIN(attendanceDate) as minDate FROM meal_attendance_snapshots
    WHERE campusId = ?
  `;
  const [rows] = await getDB().execute(query, [campusId]);
  return rows[0]?.minDate || null;
};

const MealAttendanceSnapshotModel = {
  createTable,
  create,
  findAll,
  findMinDate
};

export {
  createTable,
  create,
  findAll,
  findMinDate
};

export default MealAttendanceSnapshotModel;
