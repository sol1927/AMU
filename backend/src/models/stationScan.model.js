import { getDB } from "../config/db.js";
import { buildInClause, mapRow, mapRows, normalizeDate } from "./modelUtils.js";

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

const dropForeignKeyIfExists = async (tableName, columnName, referencedTable) => {
  const [rows] = await getDB().execute(
    `
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND REFERENCED_TABLE_NAME = ?
    `,
    [tableName, columnName, referencedTable],
  );

  for (const row of rows) {
    await getDB().execute(
      `ALTER TABLE ${tableName} DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`,
    );
  }
};

const dropIndexIfExists = async (tableName, indexName) => {
  const [rows] = await getDB().execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );

  if (rows.length === 0) {
    return;
  }

  await getDB().execute(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`);
};

const addUniqueIndexIfMissing = async (tableName, indexName, columns) => {
  const [rows] = await getDB().execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );

  if (rows.length > 0) {
    return;
  }

  await getDB().execute(
    `ALTER TABLE ${tableName} ADD UNIQUE KEY ${indexName} (${columns.join(", ")})`,
  );
};

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS station_scans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student INT NULL,
      studentId VARCHAR(255) NOT NULL,
      studentName VARCHAR(255) NOT NULL,
      department VARCHAR(255),
      batch INT,
      fastingType ENUM('not_fasting', 'fasting', 'sunday_fasting', 'muslim_fasting') DEFAULT 'not_fasting',
      isInternship BOOLEAN DEFAULT FALSE,
      campus INT NOT NULL,
      campusId INT,
      campusName VARCHAR(255),
      cafeNumber INT,
      date VARCHAR(10) NOT NULL,
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL,
      scannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_studentId_campus_date_mealType (studentId, campus, date, mealType),
      FOREIGN KEY (campus) REFERENCES campuses(id)
    );
  `;
  await getDB().execute(query);
  await addColumnIfMissing("station_scans", "studentId", "VARCHAR(255) NOT NULL DEFAULT ''");
  await addColumnIfMissing("station_scans", "studentName", "VARCHAR(255) NOT NULL DEFAULT 'Student'");
  await addColumnIfMissing("station_scans", "department", "VARCHAR(255) NULL");
  await addColumnIfMissing("station_scans", "batch", "INT NULL");
  await addColumnIfMissing(
    "station_scans",
    "fastingType",
    "ENUM('not_fasting', 'fasting', 'sunday_fasting', 'muslim_fasting') DEFAULT 'not_fasting'",
  );
  await addColumnIfMissing("station_scans", "isInternship", "BOOLEAN DEFAULT FALSE");
  await addColumnIfMissing("station_scans", "campusId", "INT NULL");
  await addColumnIfMissing("station_scans", "campusName", "VARCHAR(255) NULL");
  await addColumnIfMissing("station_scans", "cafeNumber", "INT NULL");
  await addColumnIfMissing("station_scans", "scannedAt", "DATETIME NULL");
  await getDB().execute(`
    UPDATE station_scans ss
    LEFT JOIN cafestudents cs ON ss.student = cs.id
    LEFT JOIN campuses c ON ss.campus = c.id
    SET
      ss.studentId = CASE
        WHEN (ss.studentId IS NULL OR ss.studentId = '') AND cs.studentId IS NOT NULL
          THEN cs.studentId
        ELSE ss.studentId
      END,
      ss.studentName = CASE
        WHEN (ss.studentName IS NULL OR ss.studentName = '' OR ss.studentName = 'Student') AND cs.name IS NOT NULL
          THEN cs.name
        ELSE ss.studentName
      END,
      ss.department = CASE
        WHEN ss.department IS NULL AND cs.department IS NOT NULL THEN cs.department
        ELSE ss.department
      END,
      ss.batch = CASE
        WHEN ss.batch IS NULL AND cs.batch IS NOT NULL THEN cs.batch
        ELSE ss.batch
      END,
      ss.fastingType = CASE
        WHEN (ss.fastingType IS NULL OR ss.fastingType = '') AND cs.fastingType IS NOT NULL
          THEN cs.fastingType
        ELSE ss.fastingType
      END,
      ss.isInternship = CASE
        WHEN ss.isInternship IS NULL AND cs.isInternship IS NOT NULL THEN cs.isInternship
        ELSE ss.isInternship
      END,
      ss.campusId = CASE
        WHEN ss.campusId IS NULL AND c.campusId IS NOT NULL THEN c.campusId
        ELSE ss.campusId
      END,
      ss.campusName = CASE
        WHEN (ss.campusName IS NULL OR ss.campusName = '') AND c.name IS NOT NULL
          THEN c.name
        ELSE ss.campusName
      END,
      ss.scannedAt = CASE
        WHEN ss.scannedAt IS NULL THEN ss.createdAt
        ELSE ss.scannedAt
      END
  `);
  await dropForeignKeyIfExists("station_scans", "student", "cafestudents");
  await getDB().execute("ALTER TABLE station_scans MODIFY COLUMN student INT NULL");
  await dropIndexIfExists("station_scans", "unique_student_campus_date_mealType");
  await addUniqueIndexIfMissing("station_scans", "unique_studentId_campus_date_mealType", [
    "studentId",
    "campus",
    "date",
    "mealType",
  ]);
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM station_scans WHERE 1=1";
  const params = [];
  if (filter.student !== undefined && filter.student !== null) {
    query += " AND student = ?";
    params.push(filter.student);
  }
  if (filter.studentId) {
    query += " AND studentId = ?";
    params.push(filter.studentId);
  }
  if (filter.campus !== undefined && filter.campus !== null) {
    query += " AND campus = ?";
    params.push(filter.campus);
  }
  if (filter.date) {
    query += " AND date = ?";
    params.push(filter.date);
  }
  if (filter.cafeNumber !== undefined && filter.cafeNumber !== null) {
    query += " AND cafeNumber = ?";
    params.push(filter.cafeNumber);
  }
  if (filter.mealType) {
    query += " AND mealType = ?";
    params.push(filter.mealType);
  }
  if (Array.isArray(filter.ids) && filter.ids.length > 0) {
    query += ` AND id IN (${buildInClause(filter.ids)})`;
    params.push(...filter.ids);
  }
  if (Array.isArray(filter.students) && filter.students.length > 0) {
    query += ` AND student IN (${buildInClause(filter.students)})`;
    params.push(...filter.students);
  }
  if (filter.orderByCreatedAtDesc) {
    query += " ORDER BY scannedAt DESC, createdAt DESC";
  }
  if (filter.limit !== undefined && filter.limit !== null) {
    const safeLimit = Number(filter.limit);
    if (Number.isInteger(safeLimit) && safeLimit > 0) {
      query += ` LIMIT ${safeLimit}`;
    }
  }
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows);
};

const findById = async (id) => {
  const [rows] = await getDB().execute(
    "SELECT * FROM station_scans WHERE id = ?",
    [id],
  );
  return mapRow(rows[0] || null);
};

const findOne = async (filter = {}) => (await findAll(filter))[0] || null;

const create = async (data) => {
  const {
    student = null,
    studentId,
    studentName,
    department = null,
    batch = null,
    fastingType = "not_fasting",
    isInternship = false,
    campus,
    campusId = null,
    campusName = null,
    cafeNumber = null,
    date,
    mealType,
    scannedAt = new Date(),
  } = data;
  const query = `
    INSERT INTO station_scans (student, studentId, studentName, department, batch, fastingType, isInternship, campus, campusId, campusName, cafeNumber, date, mealType, scannedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    student,
    studentId,
    studentName,
    department,
    batch,
    fastingType,
    isInternship ? 1 : 0,
    campus,
    campusId,
    campusName,
    cafeNumber,
    date,
    mealType,
    normalizeDate(scannedAt),
  ];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];
  if (data.student) {
    fields.push("student = ?");
    params.push(data.student);
  }
  if (data.studentId) {
    fields.push("studentId = ?");
    params.push(data.studentId);
  }
  if (data.studentName) {
    fields.push("studentName = ?");
    params.push(data.studentName);
  }
  if (data.department !== undefined) {
    fields.push("department = ?");
    params.push(data.department);
  }
  if (data.batch !== undefined) {
    fields.push("batch = ?");
    params.push(data.batch);
  }
  if (data.fastingType) {
    fields.push("fastingType = ?");
    params.push(data.fastingType);
  }
  if (data.isInternship !== undefined) {
    fields.push("isInternship = ?");
    params.push(data.isInternship ? 1 : 0);
  }
  if (data.campus) {
    fields.push("campus = ?");
    params.push(data.campus);
  }
  if (data.campusId !== undefined) {
    fields.push("campusId = ?");
    params.push(data.campusId);
  }
  if (data.campusName !== undefined) {
    fields.push("campusName = ?");
    params.push(data.campusName);
  }
  if (data.cafeNumber !== undefined) {
    fields.push("cafeNumber = ?");
    params.push(data.cafeNumber);
  }
  if (data.date) {
    fields.push("date = ?");
    params.push(data.date);
  }
  if (data.mealType) {
    fields.push("mealType = ?");
    params.push(data.mealType);
  }
  if (data.scannedAt !== undefined) {
    fields.push("scannedAt = ?");
    params.push(normalizeDate(data.scannedAt));
  }
  if (fields.length === 0) return null;
  const query = `UPDATE station_scans SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM station_scans WHERE id = ?", [id]);
};

const deleteMany = async (filter = {}) => {
  const scans = await findAll(filter);
  await Promise.all(scans.map((scan) => deleteById(scan.id)));
  return { deletedCount: scans.length };
};

const StationScanModel = {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  deleteMany,
};

export {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  deleteMany,
};

export default StationScanModel;
