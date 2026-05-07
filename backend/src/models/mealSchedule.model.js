import { getDB } from "../config/db.js";
import { mapRow, mapRows } from "./modelUtils.js";

const mapMealScheduleRow = (row) => ({
  ...row,
  breakfast:
    typeof row.breakfast === "string" ? JSON.parse(row.breakfast) : row.breakfast,
  lunch: typeof row.lunch === "string" ? JSON.parse(row.lunch) : row.lunch,
  dinner:
    typeof row.dinner === "string" ? JSON.parse(row.dinner) : row.dinner,
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS meal_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scheduleKey VARCHAR(255),
      campusId INT NOT NULL UNIQUE,
      breakfast JSON NOT NULL,
      lunch JSON NOT NULL,
      dinner JSON NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (campusId) REFERENCES campuses(id)
    );
  `;
  await getDB().execute(query);
};

const findAll = async (filter = {}) => {
  let query =
    "SELECT id, scheduleKey AS `key`, campusId, breakfast, lunch, dinner, createdAt, updatedAt FROM meal_schedules WHERE 1=1";
  const params = [];
  if (filter.campusId) {
    query += " AND campusId = ?";
    params.push(filter.campusId);
  }
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows, mapMealScheduleRow);
};

const findById = async (id) => {
  const [rows] = await getDB().execute(
    "SELECT id, scheduleKey AS `key`, campusId, breakfast, lunch, dinner, createdAt, updatedAt FROM meal_schedules WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0], mapMealScheduleRow);
};

const findOne = async (filter = {}) => (await findAll(filter))[0] || null;

const create = async (data) => {
  const {
    key,
    campusId,
    breakfast = { start: "06:00", end: "09:00" },
    lunch = { start: "11:00", end: "14:00" },
    dinner = { start: "17:00", end: "20:00" },
  } = data;
  const query = `
    INSERT INTO meal_schedules (scheduleKey, campusId, breakfast, lunch, dinner)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [
    key,
    campusId,
    JSON.stringify(breakfast),
    JSON.stringify(lunch),
    JSON.stringify(dinner),
  ];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];
  if (data.key !== undefined) {
    fields.push("scheduleKey = ?");
    params.push(data.key);
  }
  if (data.campusId) {
    fields.push("campusId = ?");
    params.push(data.campusId);
  }
  if (data.breakfast) {
    fields.push("breakfast = ?");
    params.push(JSON.stringify(data.breakfast));
  }
  if (data.lunch) {
    fields.push("lunch = ?");
    params.push(JSON.stringify(data.lunch));
  }
  if (data.dinner) {
    fields.push("dinner = ?");
    params.push(JSON.stringify(data.dinner));
  }
  if (fields.length === 0) return null;
  const query = `UPDATE meal_schedules SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM meal_schedules WHERE id = ?", [id]);
};

export {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
};

export default {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
};
