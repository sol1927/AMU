import { dbConnection } from "../server.js";
import { mapRow, mapRows } from "./modelUtils.js";

const mapTempEmailChangeRow = (row) => ({
  ...row,
  verified: Boolean(row.verified),
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS temp_email_changes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      newEmail VARCHAR(255) NOT NULL,
      otp VARCHAR(255) NOT NULL,
      otpExpires DATETIME NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `;
  await dbConnection.execute(query);
};

const findAll = async (filter = {}) => {
  let query = "SELECT * FROM temp_email_changes WHERE 1=1";
  const params = [];
  if (filter.userId) {
    query += " AND userId = ?";
    params.push(filter.userId);
  }
  const [rows] = await dbConnection.execute(query, params);
  return mapRows(rows, mapTempEmailChangeRow);
};

const findById = async (id) => {
  const [rows] = await dbConnection.execute(
    "SELECT * FROM temp_email_changes WHERE id = ?",
    [id],
  );
  return mapRow(rows[0] || null, mapTempEmailChangeRow);
};

const findOne = async (filter = {}) => (await findAll(filter))[0] || null;

const create = async (data) => {
  const { userId, newEmail, otp, otpExpires, verified = false } = data;
  const query = `
    INSERT INTO temp_email_changes (userId, newEmail, otp, otpExpires, verified)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [userId, newEmail, otp, otpExpires, verified];
  const [result] = await dbConnection.execute(query, params);
  return { id: result.insertId, ...data };
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];
  if (data.userId) {
    fields.push("userId = ?");
    params.push(data.userId);
  }
  if (data.newEmail) {
    fields.push("newEmail = ?");
    params.push(data.newEmail);
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
  if (fields.length === 0) return null;
  const query = `UPDATE temp_email_changes SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await dbConnection.execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await dbConnection.execute("DELETE FROM temp_email_changes WHERE id = ?", [
    id,
  ]);
};

const upsertByUserId = async (userId, data) => {
  const existing = await findOne({ userId });
  if (existing) {
    return updateById(existing.id, data);
  }
  return create({ ...data, userId });
};

const TempEmailChangeModel = {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  upsertByUserId,
};

export {
  createTable,
  findAll,
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  upsertByUserId,
};

export default TempEmailChangeModel;
