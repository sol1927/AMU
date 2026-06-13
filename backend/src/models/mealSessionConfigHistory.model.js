import { getDB } from "../config/db.js";
import { mapRow, mapRows, normalizeDate } from "./modelUtils.js";

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS meal_session_configs_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sessionName VARCHAR(50) NOT NULL,
      startTime VARCHAR(5) NOT NULL,
      endTime VARCHAR(5) NOT NULL,
      appliedDate DATE NOT NULL,
      appliedTimestamp DATETIME NOT NULL,
      campusId INT NOT NULL,
      cafeteria INT DEFAULT NULL,
      createdBy INT NOT NULL,
      version INT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (campusId) REFERENCES users(id)
    );
  `;
  await getDB().execute(query);
};

const findActiveConfig = async (campusId, sessionName, targetDateStr) => {
  const query = `
    SELECT * FROM meal_session_configs_history
    WHERE campusId = ? AND sessionName = ? AND appliedDate <= ?
    ORDER BY appliedDate DESC, appliedTimestamp DESC, version DESC
    LIMIT 1
  `;
  const [rows] = await getDB().execute(query, [campusId, sessionName, targetDateStr]);
  return rows[0] || null;
};

const findLatestConfig = async (campusId, sessionName) => {
  const query = `
    SELECT * FROM meal_session_configs_history
    WHERE campusId = ? AND sessionName = ?
    ORDER BY version DESC
    LIMIT 1
  `;
  const [rows] = await getDB().execute(query, [campusId, sessionName]);
  return rows[0] || null;
};

const create = async (data) => {
  const {
    sessionName,
    startTime,
    endTime,
    appliedDate,
    appliedTimestamp = new Date(),
    campusId,
    cafeteria = null,
    createdBy,
    version
  } = data;
  const query = `
    INSERT INTO meal_session_configs_history (sessionName, startTime, endTime, appliedDate, appliedTimestamp, campusId, cafeteria, createdBy, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    sessionName,
    startTime,
    endTime,
    appliedDate,
    normalizeDate(appliedTimestamp),
    campusId,
    cafeteria,
    createdBy,
    version
  ];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const findMinDate = async (campusId) => {
  const query = `
    SELECT MIN(appliedDate) as minDate FROM meal_session_configs_history
    WHERE campusId = ?
  `;
  const [rows] = await getDB().execute(query, [campusId]);
  return rows[0]?.minDate || null;
};

const MealSessionConfigHistoryModel = {
  createTable,
  findActiveConfig,
  findLatestConfig,
  create,
  findMinDate
};

export {
  createTable,
  findActiveConfig,
  findLatestConfig,
  create,
  findMinDate
};

export default MealSessionConfigHistoryModel;
