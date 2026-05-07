import { getDB } from "../config/db.js";
import bcrypt from "bcryptjs";
import { mapRow, mapRows, normalizeDate, omitPassword } from "./modelUtils.js";

const mapUserRow = (row) => ({
  ...row,
  logo: row.logo_url ? { url: row.logo_url } : undefined,
  mustChangePassword: !!row.mustChangePassword,
});

const sanitizeUser = (row, includePassword = false) =>
  includePassword
    ? mapRow(row, mapUserRow)
    : omitPassword(mapRow(row, mapUserRow));

const nullable = (value) => (value === undefined ? null : value);

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      logo_url MEDIUMTEXT,
      logo_public_id VARCHAR(255),
      loginAttempts INT DEFAULT 0,
      lockUntil BIGINT,
      mustChangePassword TINYINT(1) DEFAULT 0,
      resetToken VARCHAR(255),
      resetTokenExpires DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;
  await getDB().execute(query);
  await getDB().execute(
    "ALTER TABLE users MODIFY COLUMN logo_url MEDIUMTEXT NULL",
  );
  try {
    await getDB().execute(
      "ALTER TABLE users ADD COLUMN mustChangePassword TINYINT(1) DEFAULT 0",
    );
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
};

const findAll = async (filter = {}, options = {}) => {
  let query =
    "SELECT id, name, email, password, role, logo_url, logo_public_id, loginAttempts, lockUntil, mustChangePassword, resetToken, resetTokenExpires, createdAt, updatedAt FROM users WHERE 1=1";
  const params = [];
  if (filter.email) {
    query += " AND email = ?";
    params.push(filter.email);
  }
  if (filter.role) {
    query += " AND role = ?";
    params.push(filter.role);
  }
  if (filter.excludeId !== undefined) {
    query += " AND id != ?";
    params.push(filter.excludeId);
  }
  if (filter.resetToken) {
    query += " AND resetToken = ?";
    params.push(filter.resetToken);
  }
  if (filter.resetTokenExpiresAfter) {
    query += " AND resetTokenExpires > ?";
    params.push(normalizeDate(filter.resetTokenExpiresAfter));
  }
  const [rows] = await getDB().execute(query, params);
  const mapped = mapRows(rows, mapUserRow);
  return options.includePassword ? mapped : mapped.map(omitPassword);
};

const findById = async (id, options = {}) => {
  const [rows] = await getDB().execute(
    "SELECT id, name, email, password, role, logo_url, logo_public_id, loginAttempts, lockUntil, mustChangePassword, resetToken, resetTokenExpires, createdAt, updatedAt FROM users WHERE id = ?",
    [id],
  );
  return sanitizeUser(rows[0] || null, options.includePassword);
};

const findOne = async (filter = {}, options = {}) =>
  (await findAll(filter, options))[0] || null;

const create = async (data) => {
  const {
    name,
    email,
    password,
    role = "admin",
    logo,
    loginAttempts = 0,
    lockUntil,
    mustChangePassword = 0,
    resetToken,
    resetTokenExpires,
  } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (name, email, password, role, logo_url, logo_public_id, loginAttempts, lockUntil, mustChangePassword, resetToken, resetTokenExpires)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    name,
    email,
    hashedPassword,
    role,
    nullable(logo?.url),
    null,
    loginAttempts,
    nullable(lockUntil),
    mustChangePassword ? 1 : 0,
    nullable(resetToken),
    nullable(resetTokenExpires),
  ];
  const [result] = await getDB().execute(query, params);
  return findById(result.insertId);
};

const updateById = async (id, data, options = {}) => {
  const fields = [];
  const params = [];
  if (data.name) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.email) {
    fields.push("email = ?");
    params.push(data.email);
  }
  if (data.password) {
    const hashed = await bcrypt.hash(data.password, 10);
    fields.push("password = ?");
    params.push(hashed);
  }
  if (data.role) {
    fields.push("role = ?");
    params.push(data.role);
  }
  if (data.logo) {
    fields.push("logo_url = ?");
    params.push(nullable(data.logo.url));
    fields.push("logo_public_id = ?");
    params.push(null);
  }
  if (data.loginAttempts !== undefined) {
    fields.push("loginAttempts = ?");
    params.push(data.loginAttempts);
  }
  if (data.lockUntil !== undefined) {
    fields.push("lockUntil = ?");
    params.push(data.lockUntil);
  }
  if (data.mustChangePassword !== undefined) {
    fields.push("mustChangePassword = ?");
    params.push(data.mustChangePassword ? 1 : 0);
  }
  if (data.resetToken !== undefined) {
    fields.push("resetToken = ?");
    params.push(nullable(data.resetToken));
  }
  if (data.resetTokenExpires !== undefined) {
    fields.push("resetTokenExpires = ?");
    params.push(nullable(data.resetTokenExpires));
  }
  if (fields.length === 0) return null;
  const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id, options);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM users WHERE id = ?", [id]);
};

const updateMany = async (filter = {}, data = {}) => {
  const targetUsers = await findAll(filter, { includePassword: true });
  const updated = await Promise.all(
    targetUsers.map((user) =>
      updateById(user.id, data, { includePassword: true }),
    ),
  );
  return {
    matchedCount: targetUsers.length,
    modifiedCount: updated.filter(Boolean).length,
  };
};

const comparePassword = async (id, candidatePassword) => {
  const [rows] = await getDB().execute(
    "SELECT password FROM users WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return false;
  return await bcrypt.compare(candidatePassword, rows[0].password);
};

const UserModel = {
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

export default UserModel;
