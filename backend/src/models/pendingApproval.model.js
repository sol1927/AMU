import { getDB } from "../config/db.js";
import { mapRow, mapRows } from "./modelUtils.js";

const mapApprovalRow = (row) => ({
  ...row,
  pendingData: typeof row.pendingData === "string" ? JSON.parse(row.pendingData) : row.pendingData || {},
});

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS pending_approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requesterId INT NOT NULL,
      approverRole VARCHAR(50) NOT NULL,
      requestType VARCHAR(100) DEFAULT 'profile_update',
      pendingData JSON NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;
  await getDB().execute(query);
};

const findAll = async (filter = {}) => {
  try {
    const purgeQuery = "DELETE FROM pending_approvals WHERE status = 'pending' AND createdAt < NOW() - INTERVAL 1 DAY";
    await getDB().execute(purgeQuery);
  } catch (err) {
    console.error("Failed to purge expired pending approvals:", err);
  }

  let query = "SELECT id, requesterId, approverRole, requestType, pendingData, status, createdAt, updatedAt FROM pending_approvals WHERE 1=1";
  const params = [];

  if (filter.status) {
    query += " AND status = ?";
    params.push(filter.status);
  }
  if (filter.approverRole) {
    query += " AND approverRole = ?";
    params.push(filter.approverRole);
  }
  if (filter.requesterId) {
    query += " AND requesterId = ?";
    params.push(filter.requesterId);
  }

  query += " ORDER BY createdAt DESC";
  const [rows] = await getDB().execute(query, params);
  return mapRows(rows, mapApprovalRow);
};

const findById = async (id) => {
  const [rows] = await getDB().execute(
    "SELECT id, requesterId, approverRole, requestType, pendingData, status, createdAt, updatedAt FROM pending_approvals WHERE id = ?",
    [id]
  );
  return rows[0] ? mapRow(rows[0], mapApprovalRow) : null;
};

const create = async (data) => {
  const { requesterId, approverRole, requestType = "profile_update", pendingData } = data;
  const serializedData = JSON.stringify(pendingData);
  
  const query = `
    INSERT INTO pending_approvals (requesterId, approverRole, requestType, pendingData)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await getDB().execute(query, [requesterId, approverRole, requestType, serializedData]);
  return findById(result.insertId);
};

const updateById = async (id, data) => {
  const fields = [];
  const params = [];

  if (data.status !== undefined) {
    fields.push("status = ?");
    params.push(data.status);
  }
  if (data.pendingData !== undefined) {
    fields.push("pendingData = ?");
    params.push(JSON.stringify(data.pendingData));
  }

  if (fields.length === 0) return null;
  params.push(id);

  const query = `UPDATE pending_approvals SET ${fields.join(", ")} WHERE id = ?`;
  await getDB().execute(query, params);
  return findById(id);
};

const deleteById = async (id) => {
  await getDB().execute("DELETE FROM pending_approvals WHERE id = ?", [id]);
};

const PendingApprovalModel = {
  createTable,
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};

export {
  createTable,
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};

export default PendingApprovalModel;
