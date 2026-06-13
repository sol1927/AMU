import { connectDB, getDB } from "../src/config/db.js";

const date = "2026-06-13";

const run = async () => {
  try {
    await connectDB();
    const db = getDB();

    const [campusRows] = await db.execute(
      "SELECT id, name FROM users WHERE role = 'campus' LIMIT 1",
    );
    if (!campusRows || campusRows.length === 0) {
      console.log("No campus users found in users table.");
      process.exit(0);
    }
    const campus = campusRows[0];
    const campusId = campus.id;
    console.log("Using campus:", campusId, campus.name);

    const [snapRows] = await db.execute(
      "SELECT * FROM meal_session_snapshots WHERE campusId = ? AND date = ?",
      [campusId, date],
    );
    console.log("Snapshots for", date, ":", snapRows.length);
    console.dir(snapRows, { depth: 2 });

    const [cafes] = await db.execute(
      'SELECT id, name FROM users WHERE role = "cafe" AND campusId = ?',
      [campusId],
    );
    console.log("Cafes count:", cafes.length);

    const [studentCountRows] = await db.execute(
      "SELECT COUNT(*) as cnt FROM cafestudents WHERE campusId = ?",
      [campusId],
    );
    console.log("Total students in campus:", studentCountRows[0].cnt);

    const [assignedRows] = await db.execute(
      "SELECT COUNT(*) as cnt FROM cafestudents WHERE campusId = ? AND cafeNumber IS NOT NULL",
      [campusId],
    );
    console.log("Assigned students (cafeNumber set):", assignedRows[0].cnt);

    const [scanRows] = await db.execute(
      "SELECT studentId, fastingTypeAtScanTime, cafeteria, mealSession FROM meal_scan_history WHERE campus = ? AND date = ?",
      [campusId, date],
    );
    console.log("Scan rows for", date, ":", scanRows.length);
    console.dir(scanRows.slice(0, 20), { depth: 2 });

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting report data:", err);
    process.exit(1);
  }
};

run();
