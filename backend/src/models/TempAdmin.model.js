import { getDB } from "../config/db.js";
import { mapRow, mapRows } from "./modelUtils.js";

const mapTempAdminRow = (row) => ({
  ...row,
  verified: Boolean(row.verified),
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS temp_admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL UNIQUE,
      otp VARCHAR(255) NOT NULL,
      otpExpires DATETIME NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      verifiedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;
  await getDB().execute(query);
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM temp_admins WHERE 1=1";
  const params = [];
  if (filter.email) {
    query += " AND email = ?";
    params.push(filter.email);
  }
  if (filter.verified !== undefined) {
    query += " AND verified = ?";
    params.push(filter.verified);
  }
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows, mapTempAdminRow);
};

const findById = async (id) => {
  const [rows] = await getDB().execute(
    "SELECT * FROM temp_admins WHERE id = ?",
    [id],
  );
  return mapRow(rows[0] || null, mapTempAdminRow);
};

const findOne = async (filter = {}) => (await findAll(filter))[0] || null;

const create = async (data) => {
  const { name, email, otp, otpExpires, verified = false, verifiedAt } = data;
  const query = `
    INSERT INTO temp_admins (name, email, otp, otpExpires, verified, verifiedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [name, email, otp, otpExpires, verified, verifiedAt];
  const [result] = await getDB().execute(query, params);
  return { id: result.insertId, ...data };
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];
  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.email) {
    fields.push("email = ?");
    params.push(data.email);
  }
  if (data.otp) {
    fields.push("otp = ?");
    params.push(data.otp);
  }
  if (data.otpExpires) {
    fields.push("otpExpires = ?");
    params.push(data.otpExpires);
  }
  if (data.verified !== undefined) {
    fields.push("verified = ?");
    params.push(data.verified);
  }
  if (data.verifiedAt !== undefined) {
    fields.push("verifiedAt = ?");
    params.push(data.verifiedAt);
  }
  if (fields.length === 0) return null;
  const query = `UPDATE temp_admins SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await getDB().execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM temp_admins WHERE id = ?", [id]);
};

const upsertByEmail = async (email, data) => {
  await getDB().execute("DELETE FROM temp_admins");
  return create({ ...data, email });
};

const TempAdminModel = {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  upsertByEmail,
};

export {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  upsertByEmail,
};

export default TempAdminModel;
