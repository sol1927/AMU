import { getDB } from "../config/db.js";
import { mapRow, mapRows, normalizeDate } from "./modelUtils.js";

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS meal_scan_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      studentId VARCHAR(255) NOT NULL,
      studentName VARCHAR(255) NOT NULL,
      mealSession VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      exactScanTimestamp DATETIME NOT NULL,
      cafeteria INT NOT NULL,
      campus INT NOT NULL,
      fastingTypeAtScanTime VARCHAR(50) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campus) REFERENCES users(id),
      UNIQUE KEY unique_student_session_date (studentId, campus, date, mealSession)
    );
  `;
  await getDB().execute(query);
};

const create = async (data) => {
  const {
    studentId,
    studentName,
    mealSession,
    date,
    exactScanTimestamp = new Date(),
    cafeteria,
    campus,
    fastingTypeAtScanTime,
  } = data;

  const query = `
    INSERT INTO meal_scan_history (
      studentId, studentName, mealSession, date, exactScanTimestamp, cafeteria, campus, fastingTypeAtScanTime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    studentId,
    studentName,
    mealSession,
    date,
    normalizeDate(exactScanTimestamp),
    cafeteria,
    campus,
    fastingTypeAtScanTime,
  ];

  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM meal_scan_history WHERE 1=1";
  const params = [];

  if (filter.campus !== undefined && filter.campus !== null) {
    query += " AND campus = ?";
    params.push(filter.campus);
  }
  if (filter.cafeteria !== undefined && filter.cafeteria !== null) {
    query += " AND cafeteria = ?";
    params.push(filter.cafeteria);
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

const deleteMany = async (filter = {}) => {
  let query = "DELETE FROM meal_scan_history WHERE 1=1";
  const params = [];

  if (filter.campus !== undefined && filter.campus !== null) {
    query += " AND campus = ?";
    params.push(filter.campus);
  }
  if (Array.isArray(filter.ids) && filter.ids.length > 0) {
    query += ` AND id IN (${filter.ids.map(() => "?").join(", ")})`;
    params.push(...filter.ids);
  }

  const [result] = await getDB().execute(query, params);
  return { deletedCount: result.affectedRows };
};

const MealScanHistoryModel = {
  createTable,
  create,
  findAll,
  deleteMany,
};

export {
  createTable,
  create,
  findAll,
  deleteMany,
};

export default MealScanHistoryModel;
