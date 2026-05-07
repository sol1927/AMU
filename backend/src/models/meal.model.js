import { getDB } from "../config/db.js";
import { mapRow, mapRows, parseJsonField } from "./modelUtils.js";

const mapMealRow = (row) => ({
  ...row,
  appliedWindow: parseJsonField(row.appliedWindow, null),
  campusSnapshot: parseJsonField(row.campusSnapshot, null),
  studentSnapshots: parseJsonField(row.studentSnapshots, []),
  summarySnapshot: parseJsonField(row.summarySnapshot, null),
  students: parseJsonField(row.students, []),
});

const addColumnIfMissing = async (tableName, columnName, definition) => {
  const [rows] = await getDB().execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );

  if (rows.length > 0) {
    return;
  }

  await getDB().execute(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
  );
};

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS meals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campus INT NOT NULL,
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL,
      date DATE NOT NULL,
      year INT NOT NULL,
      semester ENUM('first', 'second') NOT NULL,
      campusSnapshot JSON,
      appliedWindow JSON,
      studentSnapshots JSON,
      summarySnapshot JSON,
      students JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_campus_date_mealType (campus, date, mealType),
      FOREIGN KEY (campus) REFERENCES campuses(id)
    );
  `;
  await getDB().execute(query);
  await addColumnIfMissing("meals", "campusSnapshot", "JSON NULL");
  await addColumnIfMissing("meals", "studentSnapshots", "JSON NULL");
  await addColumnIfMissing("meals", "summarySnapshot", "JSON NULL");
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM meals WHERE 1=1";
  const params = [];
  if (filter.campus) {
    query += " AND campus = ?";
    params.push(filter.campus);
  }
  if (filter.date) {
    query += " AND date = ?";
    params.push(filter.date);
  }
  if (filter.mealType) {
    query += " AND mealType = ?";
    params.push(filter.mealType);
  }
  if (filter.year) {
    query += " AND year = ?";
    params.push(filter.year);
  }
  if (filter.semester) {
    query += " AND semester = ?";
    params.push(filter.semester);
  }
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows, mapMealRow);
};

const findById = async (id) => {
  const [rows] = await getDB().execute(
    "SELECT * FROM meals WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0], mapMealRow);
};

const findOne = async (filter = {}) => (await findAll(filter))[0] || null;

const create = async (data) => {
  const {
    campus,
    mealType,
    date,
    year,
    semester,
    campusSnapshot,
    appliedWindow,
    studentSnapshots = [],
    summarySnapshot = null,
    students = [],
  } = data;
  const query = `
    INSERT INTO meals (campus, mealType, date, year, semester, campusSnapshot, appliedWindow, studentSnapshots, summarySnapshot, students)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    campus,
    mealType,
    date,
    year,
    semester,
    JSON.stringify(campusSnapshot || null),
    JSON.stringify(appliedWindow),
    JSON.stringify(studentSnapshots),
    JSON.stringify(summarySnapshot),
    JSON.stringify(students),
  ];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];
  if (data.campus) {
    fields.push("campus = ?");
    params.push(data.campus);
  }
  if (data.mealType) {
    fields.push("mealType = ?");
    params.push(data.mealType);
  }
  if (data.date) {
    fields.push("date = ?");
    params.push(data.date);
  }
  if (data.year) {
    fields.push("year = ?");
    params.push(data.year);
  }
  if (data.semester) {
    fields.push("semester = ?");
    params.push(data.semester);
  }
  if (data.campusSnapshot !== undefined) {
    fields.push("campusSnapshot = ?");
    params.push(JSON.stringify(data.campusSnapshot));
  }
  if (data.appliedWindow) {
    fields.push("appliedWindow = ?");
    params.push(JSON.stringify(data.appliedWindow));
  }
  if (data.studentSnapshots !== undefined) {
    fields.push("studentSnapshots = ?");
    params.push(JSON.stringify(data.studentSnapshots));
  }
  if (data.summarySnapshot !== undefined) {
    fields.push("summarySnapshot = ?");
    params.push(JSON.stringify(data.summarySnapshot));
  }
  if (data.students) {
    fields.push("students = ?");
    params.push(JSON.stringify(data.students));
  }
  if (fields.length === 0) return null;
  const query = `UPDATE meals SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM meals WHERE id = ?", [id]);
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
