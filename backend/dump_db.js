import { connectDB, getDB } from "./src/config/db.js";

(async () => {
  try {
    await connectDB();
    const db = getDB();

    console.log("=== CAMPUS / USERS ===");
    const [users] = await db.execute("SELECT id, name, role, campusId, createdBy FROM users");
    console.table(users);

    console.log("=== STUDENTS (Sample) ===");
    const [students] = await db.execute("SELECT id, name, studentId, campusId, cafeNumber, fastingType, isInternship, breakfast, lunch, dinner FROM cafestudents LIMIT 10");
    console.table(students);
    
    console.log("=== CAFESTUDENTS COUNT ===");
    const [studentCount] = await db.execute("SELECT campusId, COUNT(*) as count FROM cafestudents GROUP BY campusId");
    console.table(studentCount);

    console.log("=== MEALS SNAPSHOTS ===");
    const [snapshots] = await db.execute("SELECT * FROM meal_attendance_snapshots LIMIT 10");
    console.table(snapshots);

    console.log("=== MEAL SESSION CONFIGS HISTORY ===");
    const [configs] = await db.execute("SELECT * FROM meal_session_configs_history LIMIT 10");
    console.table(configs);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
