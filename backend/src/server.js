import dotenv from "dotenv";
import app from "./app.js";
import mysql from "mysql2/promise";
import { createTable as createUserTable } from "./models/user.model.js";
import { createTable as createCampusTable } from "./models/campus.model.js";
import { createTable as createCafeStudentTable } from "./models/cafeStudent.model.js";
import { createTable as createMealTable } from "./models/meal.model.js";
import { createTable as createMealScheduleTable } from "./models/mealSchedule.model.js";
import { createTable as createStationScanTable } from "./models/stationScan.model.js";
import { createTable as createTempAdminTable } from "./models/TempAdmin.model.js";
import { createTable as createTempEmailChangeTable } from "./models/TempEmailChange.model.js";
import { logInternalError } from "./utils/safeError.js";

const reloadEnv = () => dotenv.config({ override: true });

reloadEnv();

const PORT = process.env.PORT || 5000;
const DB_RETRY_DELAY_MS = 10000;

let dbConnection = null;
let databaseInitializationPromise = null;
let lastDatabaseInitializationAt = 0;
let dbConnectionErrorMessage = "";
let reconnectTimeout = null;

const initializeDatabase = async () => {
  await createUserTable();
  await createCampusTable();
  await createCafeStudentTable();
  await createMealTable();
  await createMealScheduleTable();
  await createStationScanTable();
  await createTempAdminTable();
  await createTempEmailChangeTable();
};

const ensureDatabaseTables = async ({ force = false } = {}) => {
  const now = Date.now();

  if (
    !force &&
    lastDatabaseInitializationAt &&
    now - lastDatabaseInitializationAt < 15000
  ) {
    return;
  }

  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase()
      .then(() => {
        lastDatabaseInitializationAt = Date.now();
      })
      .finally(() => {
        databaseInitializationPromise = null;
      });
  }

  await databaseInitializationPromise;
};

const getDatabaseConnectionErrorMessage = () =>
  dbConnectionErrorMessage ||
  "The server is reconnecting to the database. Please wait a moment and try again.";

const getLocalDatabaseConfig = () => ({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const getBaseConnectionConfig = () => ({
  host: getLocalDatabaseConfig().host,
  port: getLocalDatabaseConfig().port,
  user: getLocalDatabaseConfig().user,
  password: getLocalDatabaseConfig().password,
});

const ensureDatabaseExists = async () => {
  const { database } = getLocalDatabaseConfig();

  if (!database) {
    const error = new Error("Local database name is missing.");
    error.code = "ER_NO_DB_ERROR";
    throw error;
  }

  const adminConnection = await mysql.createConnection(getBaseConnectionConfig());
  try {
    await adminConnection.query("CREATE DATABASE IF NOT EXISTS ??", [database]);
  } finally {
    await adminConnection.end();
  }
};

const scheduleReconnect = () => {
  if (reconnectTimeout) {
    return;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    void connectToDB();
  }, DB_RETRY_DELAY_MS);
};

const connectToDB = async () => {
  try {
    reloadEnv();
    const { database } = getLocalDatabaseConfig();
    await ensureDatabaseExists();
    dbConnection = await mysql.createConnection({
      ...getBaseConnectionConfig(),
      database,
    });
    await ensureDatabaseTables({ force: true });
    dbConnectionErrorMessage = "";
  } catch (error) {
    dbConnection = null;
    dbConnectionErrorMessage =
      error?.code === "ER_NO_DB_ERROR"
        ? "Local database is not configured. Set DB_NAME in backend/.env and try again."
        : "Database connection failed. Check your local database configuration and try again.";
    logInternalError("mysql-connect", error);
    console.error(getDatabaseConnectionErrorMessage());
    scheduleReconnect();
  }
};

void connectToDB();

app.listen(PORT, () => {
  console.log(`Backend is working on port ${PORT}`);
});

export { dbConnection, ensureDatabaseTables, getDatabaseConnectionErrorMessage };
