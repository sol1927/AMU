import { getDB } from "../config/db.js";
import { ensureDatabaseTables } from "../server.js";

export const requireDatabaseConnection = async (_req, res, next) => {
  try {
    const db = getDB();
    await db.ping();
    await ensureDatabaseTables();
    return next();
  } catch {
    return res.status(503).json({
      message: "Database not ready. Please try again.",
    });
  }
};
