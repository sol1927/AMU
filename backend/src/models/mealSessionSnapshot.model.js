import { getDB } from "../config/db.js";
import { mapRow, mapRows, normalizeDate } from "./modelUtils.js";

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS meal_session_snapshots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campusId INT NOT NULL,
      cafeteriaId INT NOT NULL,
      cafeteriaName VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      mealSession VARCHAR(50) NOT NULL,
      sessionStartTime VARCHAR(5) NOT NULL,
      sessionEndTime VARCHAR(5) NOT NULL,
      snapshotCreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      sessionStatus VARCHAR(10) NOT NULL DEFAULT 'Active',
      totalStudents INT NOT NULL,
      assignedStudents INT NOT NULL,
      unassignedStudents INT NOT NULL,
      orthodoxFastingCount INT NOT NULL,
      muslimFastingCount INT NOT NULL,
      sundayFastingCount INT NOT NULL,
      notFastingCount INT NOT NULL,
      servedCount INT NOT NULL DEFAULT 0,
      unservedCount INT NOT NULL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_campus_cafe_date_session (campusId, cafeteriaId, date, mealSession),
      FOREIGN KEY (campusId) REFERENCES users(id)
    );
  `;
  await getDB().execute(query);
};

const create = async (data) => {
  const {
    campusId,
    cafeteriaId,
    cafeteriaName,
    date,
    mealSession,
    sessionStartTime,
    sessionEndTime,
    snapshotCreatedAt = new Date(),
    sessionStatus = "Active",
    totalStudents,
    assignedStudents,
    unassignedStudents,
    orthodoxFastingCount,
    muslimFastingCount,
    sundayFastingCount,
    notFastingCount,
    servedCount = 0,
    unservedCount = 0,
  } = data;

  const query = `
    INSERT INTO meal_session_snapshots (
      campusId, cafeteriaId, cafeteriaName, date, mealSession,
      sessionStartTime, sessionEndTime, snapshotCreatedAt, sessionStatus,
      totalStudents, assignedStudents, unassignedStudents,
      orthodoxFastingCount, muslimFastingCount, sundayFastingCount, notFastingCount,
      servedCount, unservedCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    campusId,
    cafeteriaId,
    cafeteriaName,
    date,
    mealSession,
    sessionStartTime,
    sessionEndTime,
    normalizeDate(snapshotCreatedAt),
    sessionStatus,
    totalStudents,
    assignedStudents,
    unassignedStudents,
    orthodoxFastingCount,
    muslimFastingCount,
    sundayFastingCount,
    notFastingCount,
    servedCount,
    unservedCount,
  ];

  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM meal_session_snapshots WHERE 1=1";
  const params = [];

  if (filter.campusId !== undefined && filter.campusId !== null) {
    query += " AND campusId = ?";
    params.push(filter.campusId);
  }
  if (filter.cafeteriaId !== undefined && filter.cafeteriaId !== null) {
    query += " AND cafeteriaId = ?";
    params.push(filter.cafeteriaId);
  }
  if (filter.date) {
    query += " AND date = ?";
    params.push(filter.date);
  }
  if (filter.mealSession) {
    query += " AND mealSession = ?";
    params.push(filter.mealSession);
  }
  if (filter.startDate && filter.endDate) {
    query += " AND date >= ? AND date <= ?";
    params.push(filter.startDate, filter.endDate);
  }

  const [rows] = await getDB().execute(query, params);
  return mapRows(rows);
};

const findOne = async (filter = {}) => {
  const rows = await findAll(filter);
  return rows[0] || null;
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];

  const updateableFields = [
    "sessionStartTime",
    "sessionEndTime",
    "sessionStatus",
    "totalStudents",
    "assignedStudents",
    "unassignedStudents",
    "orthodoxFastingCount",
    "muslimFastingCount",
    "sundayFastingCount",
    "notFastingCount",
    "servedCount",
    "unservedCount",
  ];

  for (const field of updateableFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (fields.length === 0) return null;

  const query = `UPDATE meal_session_snapshots SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);

  const [rows] = await getDB().execute("SELECT * FROM meal_session_snapshots WHERE id = ?", [id]);
  return mapRow(rows[0]);
};

const findMinDate = async (campusId) => {
  const query = "SELECT MIN(date) as minDate FROM meal_session_snapshots WHERE campusId = ?";
  const [rows] = await getDB().execute(query, [campusId]);
  return rows[0]?.minDate || null;
};

const MealSessionSnapshotModel = {
  createTable,
  create,
  findAll,
  findOne,
  updateById,
  findMinDate,
};

export {
  createTable,
  create,
  findAll,
  findOne,
  updateById,
  findMinDate,
};

export default MealSessionSnapshotModel;
