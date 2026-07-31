import { getDB } from "../config/db.js";
import { buildInClause, mapRow, mapRows } from "./modelUtils.js";

const nullable = (value) => (value === undefined ? null : value);

const mapCafeStudentRow = (row) => ({
  ...row,
  isInternship: Boolean(row.isInternship),
  cafeNumber: row.cafeNumber ?? null,
  mealStatus: {
    breakfast: !!row.breakfast,
    lunch: !!row.lunch,
    dinner: !!row.dinner,
  },
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS cafestudents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      profileUrl VARCHAR(255),
      profilePublicId VARCHAR(255),
      studentId VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
      batch INT NOT NULL,
      department VARCHAR(255) NOT NULL,
      campusId INT NOT NULL,
      cafeNumber INT DEFAULT NULL,
      isInternship BOOLEAN DEFAULT FALSE,
      fastingType ENUM('not_fasting', 'fasting', 'sunday_fasting', 'muslim_fasting') DEFAULT 'not_fasting',
      breakfast BOOLEAN DEFAULT FALSE,
      lunch BOOLEAN DEFAULT FALSE,
      dinner BOOLEAN DEFAULT FALSE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_campusId (campusId)
    );
  `;
  await getDB().execute(query);

  // Ensure id has AUTO_INCREMENT in case the table was created by an older migration without it
  await getDB().execute(
    "ALTER TABLE cafestudents MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT",
  );

  await getDB().execute(
    "ALTER TABLE cafestudents MODIFY COLUMN studentId VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL",
  );
  const [existingColumns] = await getDB().execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cafestudents' AND COLUMN_NAME = 'cafeNumber'",
  );
  if (!Array.isArray(existingColumns) || existingColumns.length === 0) {
    await getDB().execute(
      "ALTER TABLE cafestudents ADD COLUMN cafeNumber INT DEFAULT NULL",
    );
  }
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM cafestudents WHERE 1=1";
  const params = [];
  if (filter.campusId !== undefined && filter.campusId !== null) {
    query += " AND campusId = ?";
    params.push(filter.campusId);
  } else if (filter.campusId === null) {
    query += " AND 1 = 0";
  }
  if (Array.isArray(filter.campusIds) && filter.campusIds.length > 0) {
    query += ` AND campusId IN (${buildInClause(filter.campusIds)})`;
    params.push(...filter.campusIds);
  }
  if (filter.fastingType) {
    query += " AND fastingType = ?";
    params.push(filter.fastingType);
  }
  if (filter.batch !== undefined) {
    query += " AND batch = ?";
    params.push(filter.batch);
  }
  if (filter.studentId) {
    query += " AND studentId = ?";
    params.push(filter.studentId);
  }
  if (Array.isArray(filter.studentIds) && filter.studentIds.length > 0) {
    query += ` AND studentId IN (${buildInClause(filter.studentIds)})`;
    params.push(...filter.studentIds);
  } else if (Array.isArray(filter.studentIds)) {
    query += " AND 1 = 0";
  }
  if (Array.isArray(filter.ids) && filter.ids.length > 0) {
    query += ` AND id IN (${buildInClause(filter.ids)})`;
    params.push(...filter.ids);
  } else if (Array.isArray(filter.ids)) {
    query += " AND 1 = 0";
  }
  if (filter.isInternship !== undefined) {
    query += " AND isInternship = ?";
    params.push(filter.isInternship);
  }
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows, mapCafeStudentRow);
};

const findById = async (id) => {
  const [rows] = await getDB().execute(
    "SELECT * FROM cafestudents WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0], mapCafeStudentRow);
};

const findOne = async (filter = {}) => (await findAll(filter))[0] || null;

const create = async (data) => {
  const {
    name,
    profileUrl,
    profilePublicId,
    studentId,
    batch,
    department,
    campusId,
    isInternship = false,
    fastingType = "not_fasting",
    mealStatus = {},
  } = data;
  const query = `
    INSERT INTO cafestudents (name, profileUrl, profilePublicId, studentId, batch, department, campusId, cafeNumber, isInternship, fastingType, breakfast, lunch, dinner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    name,
    nullable(profileUrl),
    nullable(profilePublicId),
    studentId,
    batch,
    department,
    campusId,
    data.cafeNumber !== undefined ? data.cafeNumber : null,
    isInternship,
    fastingType,
    mealStatus.breakfast ? 1 : 0,
    mealStatus.lunch ? 1 : 0,
    mealStatus.dinner ? 1 : 0,
  ];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];
  if (data.name) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.profileUrl !== undefined) {
    fields.push("profileUrl = ?");
    params.push(nullable(data.profileUrl));
  }
  if (data.profilePublicId !== undefined) {
    fields.push("profilePublicId = ?");
    params.push(nullable(data.profilePublicId));
  }
  if (data.studentId) {
    fields.push("studentId = ?");
    params.push(data.studentId);
  }
  if (data.batch) {
    fields.push("batch = ?");
    params.push(data.batch);
  }
  if (data.department) {
    fields.push("department = ?");
    params.push(data.department);
  }
  if (data.campusId) {
    fields.push("campusId = ?");
    params.push(data.campusId);
  }
  if (data.cafeNumber !== undefined) {
    fields.push("cafeNumber = ?");
    params.push(data.cafeNumber);
  }
  if (data.isInternship !== undefined) {
    fields.push("isInternship = ?");
    params.push(data.isInternship);
  }
  if (data.fastingType) {
    fields.push("fastingType = ?");
    params.push(data.fastingType);
  }
  if (data.mealStatus) {
    fields.push("breakfast = ?");
    params.push(data.mealStatus.breakfast ? 1 : 0);
    fields.push("lunch = ?");
    params.push(data.mealStatus.lunch ? 1 : 0);
    fields.push("dinner = ?");
    params.push(data.mealStatus.dinner ? 1 : 0);
  }
  if (fields.length === 0) return null;
  const query = `UPDATE cafestudents SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM cafestudents WHERE id = ?", [id]);
};

const countDocuments = async (filter = {}) => {
  let query = "SELECT COUNT(*) as count FROM cafestudents WHERE 1=1";
  const params = [];
  if (filter.campusId !== undefined && filter.campusId !== null) {
    query += " AND campusId = ?";
    params.push(filter.campusId);
  } else if (filter.campusId === null) {
    query += " AND 1 = 0";
  }
  if (Array.isArray(filter.campusIds) && filter.campusIds.length > 0) {
    query += ` AND campusId IN (${buildInClause(filter.campusIds)})`;
    params.push(...filter.campusIds);
  }
  if (filter.batch !== undefined) {
    query += " AND batch = ?";
    params.push(filter.batch);
  }
  if (filter.cafeNumber !== undefined && filter.cafeNumber !== null) {
    query += " AND cafeNumber = ?";
    params.push(filter.cafeNumber);
  }
  if (filter.cafeNumber !== undefined && filter.cafeNumber !== null) {
    query += " AND cafeNumber = ?";
    params.push(filter.cafeNumber);
  }
  if (filter.fastingType) {
    query += " AND fastingType = ?";
    params.push(filter.fastingType);
  }
  if (filter.isInternship !== undefined) {
    query += " AND isInternship = ?";
    params.push(filter.isInternship);
  }
  const [rows] = await getDB().execute(query, params);
  return rows[0].count;
};

const insertMany = async (students = []) => {
  const inserted = [];
  for (const student of students) {
    inserted.push(await create(student));
  }
  return inserted;
};

const updateMany = async (filter = {}, data = {}) => {
  const students = await findAll(filter);
  const updated = await Promise.all(
    students.map((student) => updateById(student.id, data)),
  );
  return {
    matchedCount: students.length,
    modifiedCount: updated.filter(Boolean).length,
  };
};

const deleteMany = async (filter = {}) => {
  const students = await findAll(filter);
  await Promise.all(students.map((student) => deleteById(student.id)));
  return { deletedCount: students.length };
};

const distinct = async (field, filter = {}) => {
  const students = await findAll(filter);
  return Array.from(
    new Set(
      students
        .map((student) => student[field])
        .filter((value) => value !== undefined && value !== null),
    ),
  );
};

const CafeStudentModel = {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  countDocuments,
  insertMany,
  updateMany,
  deleteMany,
  distinct,
};

export {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  countDocuments,
  insertMany,
  updateMany,
  deleteMany,
  distinct,
};

export default CafeStudentModel;
