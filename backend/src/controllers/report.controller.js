import { getDB } from "../config/db.js";
import User from "../models/user.model.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

export const getDailyReport = async (req, res) => {
  try {
    const { date, campusId } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    let campusFilter = null;
    let consolidate = false;

    if (req.userRole === "admin") {
      if (campusId) {
        campusFilter = campusId;
      } else {
        consolidate = true;
      }
    } else if (req.userRole === "campus") {
      campusFilter = req.userId;
    } else if (req.userRole === "cafe") {
      // Find campusId for cafe user
      const cafeUser = await User.findById(req.userId);
      if (!cafeUser) {
        return res.status(404).json({ message: "Cafeteria account not found." });
      }
      campusFilter = cafeUser.campusId;
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    let query = `
      SELECT
        mealType,
        cafeNumber,
        fastingType,
        isInternship,
        COUNT(*) as count
      FROM station_scans
      WHERE date = ?
    `;
    const params = [targetDate];

    if (!consolidate) {
      query += " AND campus = ?";
      params.push(campusFilter);
    }

    query += " GROUP BY mealType, cafeNumber, fastingType, isInternship";

    const [rows] = await getDB().execute(query, params);

    const formatted = {
      date: targetDate,
      consolidated: consolidate,
      meals: {
        breakfast: { total: 0, fasting: 0, sundayFasting: 0, muslimFasting: 0, notFasting: 0, regular: 0, internship: 0, cafeBreakdown: {} },
        lunch: { total: 0, fasting: 0, sundayFasting: 0, muslimFasting: 0, notFasting: 0, regular: 0, internship: 0, cafeBreakdown: {} },
        dinner: { total: 0, fasting: 0, sundayFasting: 0, muslimFasting: 0, notFasting: 0, regular: 0, internship: 0, cafeBreakdown: {} },
      }
    };

    rows.forEach(row => {
      const meal = row.mealType.toLowerCase();
      if (!formatted.meals[meal]) return;

      const count = Number(row.count);
      formatted.meals[meal].total += count;

      if (row.fastingType === "fasting") formatted.meals[meal].fasting += count;
      else if (row.fastingType === "sunday_fasting") formatted.meals[meal].sundayFasting += count;
      else if (row.fastingType === "muslim_fasting") formatted.meals[meal].muslimFasting += count;
      else formatted.meals[meal].notFasting += count;

      if (row.isInternship) {
        formatted.meals[meal].internship += count;
      } else {
        formatted.meals[meal].regular += count;
      }

      const cafeNum = row.cafeNumber || 1;
      if (!formatted.meals[meal].cafeBreakdown[cafeNum]) {
        formatted.meals[meal].cafeBreakdown[cafeNum] = 0;
      }
      formatted.meals[meal].cafeBreakdown[cafeNum] += count;
    });

    res.json(formatted);
  } catch (err) {
    logInternalError("daily-report", err);
    sendServerError(res, "Could not generate daily report.");
  }
};

export const getWeeklyReport = async (req, res) => {
  try {
    const { campusId } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = startDate.toISOString().split("T")[0];

    let campusFilter = null;
    let consolidate = false;

    if (req.userRole === "admin") {
      if (campusId) {
        campusFilter = campusId;
      } else {
        consolidate = true;
      }
    } else if (req.userRole === "campus") {
      campusFilter = req.userId;
    } else if (req.userRole === "cafe") {
      const cafeUser = await User.findById(req.userId);
      if (!cafeUser) {
        return res.status(404).json({ message: "Cafeteria account not found." });
      }
      campusFilter = cafeUser.campusId;
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    let query = `
      SELECT
        date,
        COUNT(*) as totalScans,
        SUM(CASE WHEN isInternship = 1 THEN 1 ELSE 0 END) as internshipScans,
        SUM(CASE WHEN isInternship = 0 THEN 1 ELSE 0 END) as regularScans,
        SUM(CASE WHEN fastingType = 'fasting' THEN 1 ELSE 0 END) as fastingScans
      FROM station_scans
      WHERE date >= ?
    `;
    const params = [startDateStr];

    if (!consolidate) {
      query += " AND campus = ?";
      params.push(campusFilter);
    }

    query += " GROUP BY date ORDER BY date ASC";

    const [rows] = await getDB().execute(query, params);

    res.json({
      startDate: startDateStr,
      consolidated: consolidate,
      days: rows.map(r => ({
        date: r.date,
        totalScans: Number(r.totalScans || 0),
        internshipScans: Number(r.internshipScans || 0),
        regularScans: Number(r.regularScans || 0),
        fastingScans: Number(r.fastingScans || 0),
      }))
    });
  } catch (err) {
    logInternalError("weekly-report", err);
    sendServerError(res, "Could not generate weekly report.");
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { campusId } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    const startDateStr = startDate.toISOString().split("T")[0];

    let campusFilter = null;
    let consolidate = false;

    if (req.userRole === "admin") {
      if (campusId) {
        campusFilter = campusId;
      } else {
        consolidate = true;
      }
    } else if (req.userRole === "campus") {
      campusFilter = req.userId;
    } else if (req.userRole === "cafe") {
      const cafeUser = await User.findById(req.userId);
      if (!cafeUser) {
        return res.status(404).json({ message: "Cafeteria account not found." });
      }
      campusFilter = cafeUser.campusId;
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    let query = `
      SELECT
        date,
        COUNT(*) as totalScans,
        SUM(CASE WHEN isInternship = 1 THEN 1 ELSE 0 END) as internshipScans,
        SUM(CASE WHEN isInternship = 0 THEN 1 ELSE 0 END) as regularScans,
        SUM(CASE WHEN fastingType = 'fasting' THEN 1 ELSE 0 END) as fastingScans
      FROM station_scans
      WHERE date >= ?
    `;
    const params = [startDateStr];

    if (!consolidate) {
      query += " AND campus = ?";
      params.push(campusFilter);
    }

    query += " GROUP BY date ORDER BY date ASC";

    const [rows] = await getDB().execute(query, params);

    res.json({
      startDate: startDateStr,
      consolidated: consolidate,
      days: rows.map(r => ({
        date: r.date,
        totalScans: Number(r.totalScans || 0),
        internshipScans: Number(r.internshipScans || 0),
        regularScans: Number(r.regularScans || 0),
        fastingScans: Number(r.fastingScans || 0),
      }))
    });
  } catch (err) {
    logInternalError("monthly-report", err);
    sendServerError(res, "Could not generate monthly report.");
  }
};
