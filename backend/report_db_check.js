import { connectDB, getDB } from "./src/config/db.js";
(async () => {
  await connectDB();
  const db = getDB();
  const campusId = 1;
  const [rows] = await db.execute(
    "SELECT DISTINCT studentId FROM station_scans WHERE (campus = ? OR campusId = ?) AND date = ? AND isInternship = 0",
    [campusId, campusId, "2026-06-09"],
  );
  console.log(
    "scan matches",
    rows.length,
    rows.map((r) => r.studentId),
  );
})();
