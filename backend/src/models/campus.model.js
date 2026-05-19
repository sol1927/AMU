import { getDB } from "../config/db.js";
import bcrypt from "bcryptjs";
import {
  mapRow,
  mapRows,
  normalizeDate,
  omitPassword,
  parseJsonField,
} from "./modelUtils.js";
import {
  buildCafeNumbers,
  normalizeBatchCafeAssignments,
  normalizeCafeCount,
} from "../utils/cafeScope.js";

const mapCampusRow = (row) => ({
  ...row,
  logo: row.logo_url ? { url: row.logo_url } : undefined,
  cafeCount: normalizeCafeCount(row.cafeCount),
  batchCafeAssignments: normalizeBatchCafeAssignments(
    parseJsonField(row.batchCafeAssignments, {}),
    row.cafeCount,
  ),
  cafeNumbers: buildCafeNumbers(row.cafeCount),
});

const sanitizeCampus = (row, includePassword = false) =>
  includePassword
    ? mapRow(row, mapCampusRow)
    : omitPassword(mapRow(row, mapCampusRow));

const nullable = (value) => (value === undefined ? null : value);

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS campuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campusId INT UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      loginAttempts INT DEFAULT 0,
      lockUntil BIGINT,
      password VARCHAR(255) NOT NULL,
      location VARCHAR(255) DEFAULT '',
      createdBy INT NOT NULL,
      logo_url MEDIUMTEXT,
      logo_public_id VARCHAR(255),
      role ENUM('campus', 'admin') DEFAULT 'campus',
      isOnline BOOLEAN DEFAULT FALSE,
      lastActiveAt DATETIME,
      cafeCount INT DEFAULT 1,
      batchCafeAssignments JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_name_createdBy (name, createdBy),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );
  `;
  await getDB().execute(query);
  await getDB().execute(
    "ALTER TABLE campuses MODIFY COLUMN logo_url MEDIUMTEXT NULL",
  );
  const [cafeCountRows] = await getDB().execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'campuses'
        AND COLUMN_NAME = 'cafeCount'
      LIMIT 1
    `,
  );
  if (cafeCountRows.length === 0) {
    await getDB().execute(
      "ALTER TABLE campuses ADD COLUMN cafeCount INT DEFAULT 1",
    );
  }
  const [batchAssignmentRows] = await getDB().execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'campuses'
        AND COLUMN_NAME = 'batchCafeAssignments'
      LIMIT 1
    `,
  );
  if (batchAssignmentRows.length === 0) {
    await getDB().execute(
      "ALTER TABLE campuses ADD COLUMN batchCafeAssignments JSON NULL",
    );
  }
};

const findAll = async (filter = {}, options = {}) => {
  let query =
    "SELECT id, campusId, name, email, password, loginAttempts, lockUntil, location, createdBy, logo_url, logo_public_id, role, isOnline, lastActiveAt, cafeCount, batchCafeAssignments, createdAt, updatedAt FROM campuses WHERE 1=1";
  const params = [];
  if (filter.createdBy) {
    query += " AND createdBy = ?";
    params.push(filter.createdBy);
  }
  if (filter.email) {
    query += " AND email = ?";
    params.push(filter.email);
  }
  if (filter.campusId !== undefined) {
    query += " AND campusId = ?";
    params.push(filter.campusId);
  }
  if (filter.excludeId !== undefined) {
    query += " AND id != ?";
    params.push(filter.excludeId);
  }
  if (filter.nameInsensitive) {
    query += " AND LOWER(name) = LOWER(?)";
    params.push(filter.nameInsensitive);
  }
  if (filter.role) {
    query += " AND role = ?";
    params.push(filter.role);
  }
  const [rows] = await getDB().execute(query, params);
  const mapped = mapRows(rows, mapCampusRow);
  return options.includePassword ? mapped : mapped.map(omitPassword);
};

const findById = async (id, options = {}) => {
  const [rows] = await getDB().execute(
    "SELECT id, campusId, name, email, password, loginAttempts, lockUntil, location, createdBy, logo_url, logo_public_id, role, isOnline, lastActiveAt, cafeCount, batchCafeAssignments, createdAt, updatedAt FROM campuses WHERE id = ?",
    [id],
  );
  return sanitizeCampus(rows[0] || null, options.includePassword);
};

const findOne = async (filter = {}, options = {}) =>
  (await findAll(filter, options))[0] || null;

const create = async (data) => {
  const {
    campusId,
    name,
    email,
    password,
    location = "",
    createdBy,
    logo,
    role = "campus",
    isOnline = false,
    lastActiveAt,
    cafeCount = 1,
    batchCafeAssignments = {},
  } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO campuses (campusId, name, email, password, location, createdBy, logo_url, logo_public_id, role, isOnline, lastActiveAt, cafeCount, batchCafeAssignments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    campusId,
    name,
    email,
    hashedPassword,
    location,
    createdBy,
    nullable(logo?.url),
    null,
    role,
    isOnline,
    normalizeDate(lastActiveAt),
    normalizeCafeCount(cafeCount),
    JSON.stringify(normalizeBatchCafeAssignments(batchCafeAssignments, cafeCount)),
  ];
  const [result] = await getDB().execute(query, params);
  return findById(result.insertId);
};

const updateById = async (id, data, options = {}) => {
  const fields = [];
  const params = [];
  if (data.campusId !== undefined) {
    fields.push("campusId = ?");
    params.push(data.campusId);
  }
  if (data.name) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.email) {
    fields.push("email = ?");
    params.push(data.email);
  }
  if (data.loginAttempts !== undefined) {
    fields.push("loginAttempts = ?");
    params.push(data.loginAttempts);
  }
  if (data.lockUntil !== undefined) {
    fields.push("lockUntil = ?");
    params.push(data.lockUntil);
  }
  if (data.password) {
    const hashed = await bcrypt.hash(data.password, 10);
    fields.push("password = ?");
    params.push(hashed);
  }
  if (data.location !== undefined) {
    fields.push("location = ?");
    params.push(data.location);
  }
  if (data.createdBy) {
    fields.push("createdBy = ?");
    params.push(data.createdBy);
  }
  if (data.logo) {
    fields.push("logo_url = ?");
    params.push(nullable(data.logo.url));
    fields.push("logo_public_id = ?");
    params.push(null);
  }
  if (data.role) {
    fields.push("role = ?");
    params.push(data.role);
  }
  if (data.isOnline !== undefined) {
    fields.push("isOnline = ?");
    params.push(data.isOnline);
  }
  if (data.lastActiveAt !== undefined) {
    fields.push("lastActiveAt = ?");
    params.push(normalizeDate(data.lastActiveAt));
  }
  if (data.cafeCount !== undefined) {
    fields.push("cafeCount = ?");
    params.push(normalizeCafeCount(data.cafeCount));
  }
  if (data.batchCafeAssignments !== undefined) {
    fields.push("batchCafeAssignments = ?");
    params.push(
      JSON.stringify(
        normalizeBatchCafeAssignments(
          data.batchCafeAssignments,
          data.cafeCount,
        ),
      ),
    );
  }
  if (fields.length === 0) return null;
  const query = `UPDATE campuses SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id, options);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM campuses WHERE id = ?", [id]);
};

const updateMany = async (filter = {}, data = {}) => {
  const campuses = await findAll(filter, { includePassword: true });
  const updated = await Promise.all(
    campuses.map((campus) =>
      updateById(campus.id, data, { includePassword: true }),
    ),
  );

  return {
    matchedCount: campuses.length,
    modifiedCount: updated.filter(Boolean).length,
  };
};

const comparePassword = async (id, candidatePassword) => {
  const [rows] = await getDB().execute(
    "SELECT password FROM campuses WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return false;
  return await bcrypt.compare(candidatePassword, rows[0].password);
};

const CampusModel = {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  updateMany,
  deleteById,
  comparePassword,
};

export {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  updateMany,
  deleteById,
  comparePassword,
};

export default CampusModel;
