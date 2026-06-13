import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";

import { createTable as createUserTable } from "./models/user.model.js";
import { createTable as createCafeStudentTable } from "./models/cafeStudent.model.js";
import { createTable as createMealTable } from "./models/meal.model.js";
import { createTable as createMealScheduleTable } from "./models/mealSchedule.model.js";
import { createTable as createStationScanTable } from "./models/stationScan.model.js";
import { createTable as createTempAdminTable } from "./models/TempAdmin.model.js";
import { createTable as createTempEmailChangeTable } from "./models/TempEmailChange.model.js";
import { createTable as createPendingApprovalTable } from "./models/pendingApproval.model.js";
import { createTable as createMealSessionConfigHistoryTable } from "./models/mealSessionConfigHistory.model.js";
import { createTable as createMealAttendanceSnapshotTable } from "./models/mealAttendanceSnapshot.model.js";

import { createTable as createMealSessionSnapshotTable } from "./models/mealSessionSnapshot.model.js";
import { createTable as createMealScanHistoryTable } from "./models/mealScanHistory.model.js";

dotenv.config();

process.env.TZ = process.env.TZ || "Africa/Addis_Ababa";

const PORT = process.env.PORT || 5000;

let databaseInitializationPromise = null;
let lastDatabaseInitializationAt = 0;

const initializeDatabase = async () => {
  await createUserTable();
  await createCafeStudentTable();
  await createMealTable();
  await createMealScheduleTable();
  await createStationScanTable();
  await createTempAdminTable();
  await createTempEmailChangeTable();
  await createPendingApprovalTable();
  await createMealSessionConfigHistoryTable();
  await createMealAttendanceSnapshotTable();
  await createMealSessionSnapshotTable();
  await createMealScanHistoryTable();
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

const startServer = async () => {
  try {
    await connectDB();
    await ensureDatabaseTables({ force: true });

    app.listen(PORT, () => {
      console.log(`Backend is working on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    if (error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

startServer();

export { ensureDatabaseTables };
