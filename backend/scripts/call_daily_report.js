import { connectDB } from "../src/config/db.js";
import { getDailyReport } from "../src/controllers/report.controller.js";

const run = async () => {
  await connectDB();

  const req = {
    query: {
      date: "2026-06-13",
      campusId: "2",
      // no cafeNumber to simulate All Cafes
    },
    userRole: "admin",
    userId: 1,
  };

  const res = {
    json: (payload) => {
      console.log("REPORT OUTPUT:\n", JSON.stringify(payload, null, 2));
      process.exit(0);
    },
    status: (code) => ({
      json: (p) => {
        console.log("STATUS", code, p);
        process.exit(0);
      },
    }),
  };

  try {
    await getDailyReport(req, res);
  } catch (err) {
    console.error("Error calling report:", err);
    process.exit(1);
  }
};

run();
