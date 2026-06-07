import { getDB } from "../config/db.js";
import User from "../models/user.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import { filterStudentsForCafeNumber } from "../utils/cafeScope.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

// Helper to resolve campus ID from the request user
const getCampusIdForUser = async (req) => {
  if (req.userRole === "admin") {
    if (req.query.campusId) {
      return Number(req.query.campusId);
    }
    const campuses = await User.findAll({ role: "campus", createdBy: req.userId });
    return campuses.length > 0 ? campuses[0].id : null;
  }
  if (req.userRole === "campus") {
    return req.userId;
  }
  if (req.userRole === "cafe" || req.userRole === "cafe manager") {
    const loggedInUser = await User.findById(req.userId);
    return loggedInUser ? loggedInUser.campusId : null;
  }
  return null;
};

// Common stats calculator based on period and cafeNumber filter
const calculateReportStats = async (req, res, startDateStr, endDateStr, periodType) => {
  try {
    const campusId = await getCampusIdForUser(req);
    if (!campusId) {
      return res.status(400).json({ message: "Campus ID is required or not found for this user." });
    }

    const campus = await User.findById(campusId);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found." });
    }

    const targetCafeNumber = req.query.cafeNumber ? Number(req.query.cafeNumber) : null;

    // Fetch all active regular students on the campus (isInternship = 0)
    const students = await CafeStudent.findAll({ campusId, isInternship: 0 });

    // Apply cafe selection filter using getEffectiveStudentCafeNumber
    const filteredStudents = targetCafeNumber
      ? filterStudentsForCafeNumber(students, campus, targetCafeNumber)
      : students;

    // Fetch unique student IDs who scanned during this period
    let scanQuery = `
      SELECT DISTINCT studentId
      FROM station_scans
      WHERE campus = ?
        AND date >= ?
        AND date <= ?
        AND isInternship = 0
    `;
    const scanParams = [campusId, startDateStr, endDateStr];

    if (targetCafeNumber) {
      scanQuery += " AND cafeNumber = ?";
      scanParams.push(targetCafeNumber);
    }

    const [scanRows] = await getDB().execute(scanQuery, scanParams);
    const servedStudentIds = new Set(scanRows.map(row => String(row.studentId)));

    // Fetch all distinct fasting types currently configured/present in the database
    const [typeRows] = await getDB().execute("SELECT DISTINCT fastingType FROM cafestudents");
    const allFastingTypes = typeRows.map(row => row.fastingType || "not_fasting");
    const uniqueFastingTypes = Array.from(new Set(allFastingTypes));

    // Initialize dynamic breakdown dictionary
    const breakdown = {};
    uniqueFastingTypes.forEach(type => {
      breakdown[type] = {
        total: 0,
        served: 0,
        unserved: 0
      };
    });

    let totalRegular = filteredStudents.length;
    let totalServed = 0;

    filteredStudents.forEach(student => {
      const isServed = servedStudentIds.has(String(student.studentId));
      if (isServed) {
        totalServed++;
      }

      const fType = student.fastingType || "not_fasting";
      if (!breakdown[fType]) {
        breakdown[fType] = { total: 0, served: 0, unserved: 0 };
      }

      breakdown[fType].total++;
      if (isServed) {
        breakdown[fType].served++;
      }
    });

    // Compute unserved for all types
    Object.keys(breakdown).forEach(key => {
      breakdown[key].unserved = breakdown[key].total - breakdown[key].served;
    });

    res.json({
      period: {
        type: periodType,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      cafeNumber: targetCafeNumber,
      campusName: campus.name,
      stats: {
        totalRegular,
        totalServed,
        totalUnserved: totalRegular - totalServed,
        breakdown
      }
    });
  } catch (err) {
    logInternalError(`${periodType}-report-calculation`, err);
    sendServerError(res, `Could not generate ${periodType} report.`);
  }
};

export const getDailyReport = async (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split("T")[0];
  await calculateReportStats(req, res, targetDate, targetDate, "daily");
};

export const getWeeklyReport = async (req, res) => {
  let startDateStr = req.query.startDate;
  let endDateStr = req.query.endDate;
  if (!startDateStr || !endDateStr) {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    startDateStr = start.toISOString().split("T")[0];
    endDateStr = new Date().toISOString().split("T")[0];
  }
  await calculateReportStats(req, res, startDateStr, endDateStr, "weekly");
};

export const getMonthlyReport = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || (new Date().getMonth() + 1);
  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  await calculateReportStats(req, res, startDateStr, endDateStr, "monthly");
};
