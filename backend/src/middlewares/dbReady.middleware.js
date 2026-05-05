import {
  dbConnection,
  ensureDatabaseTables,
  getDatabaseConnectionErrorMessage,
} from "../server.js";

export const requireDatabaseConnection = async (_req, res, next) => {
  if (dbConnection) {
    try {
      await dbConnection.ping();
      await ensureDatabaseTables();
      return next();
    } catch {
      // Connection failed
    }
  }

  return res.status(503).json({
    message: getDatabaseConnectionErrorMessage(),
  });
};
