import { getDB } from "../config/db.js";
import User from "../models/user.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import {
  getAppDayString,
  getAppMinutesFromDate,
} from "../utils/appTimezone.js";
import {
  filterStudentsForCafeNumber,
  getEffectiveStudentCafeNumber,
} from "../utils/cafeScope.js";
import {
  getMealScheduleAt,
  getMealSessionStatusSync,
} from "../utils/mealSession.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

// Helper to resolve campus ID from the request user
const getCampusIdForUser = async (req) => {
  if (req.userRole === "admin") {
    if (req.query.campusId) {
      const targetId = Number(req.query.campusId);
      if (!Number.isNaN(targetId)) {
        const campusUser =
          (await User.findOne({ id: targetId, role: "campus" })) ||
          (await User.findOne({ campusId: targetId, role: "campus" }));
        return campusUser ? campusUser.id : null;
      }
    }
    const campuses = await User.findAll({
      role: "campus",
      createdBy: req.userId,
    });
    return campuses.length > 0 ? campuses[0].id : null;
  }
  if (req.userRole === "campus") {
    return req.userId;
  }
  if (req.userRole === "cafe" || req.userRole === "cafe manager") {
    const loggedInUser = await User.findById(req.userId);
    if (!loggedInUser) return null;
    const campusUser =
      (await User.findOne({
        campusId: loggedInUser.campusId,
        role: "campus",
      })) ||
      (await User.findOne({ id: loggedInUser.campusId, role: "campus" }));
    return campusUser ? campusUser.id : null;
  }
  return null;
};

const getSystemLaunchDate = async (campusId) => {
  const [snapshotRows] = await getDB().execute(
    "SELECT MIN(date) as minDate FROM meal_session_snapshots WHERE campusId = ?",
    [campusId],
  );
  if (snapshotRows[0]?.minDate) {
    const val = snapshotRows[0].minDate;
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    return String(val).split("T")[0];
  }
  return null;
};

const lockExpiredSnapshots = async (campusId) => {
  try {
    const today = getAppDayString(new Date());
    const currentMinutes = getAppMinutesFromDate(new Date());

    const query =
      "SELECT * FROM meal_session_snapshots WHERE campusId = ? AND sessionStatus = 'Active'";
    const [rows] = await getDB().execute(query, [campusId]);

    for (const row of rows) {
      const [endHourText, endMinuteText] = row.sessionEndTime.split(":");
      const endMinutes = Number(endHourText) * 60 + Number(endMinuteText);
      const rowDateStr = getAppDayString(
        row.date instanceof Date ? row.date : new Date(row.date),
      );

      if (
        rowDateStr < today ||
        (rowDateStr === today && currentMinutes >= endMinutes)
      ) {
        await getDB().execute(
          "UPDATE meal_session_snapshots SET sessionStatus = 'Closed' WHERE id = ?",
          [row.id],
        );
      }
    }
  } catch (err) {
    console.error("Failed to lock expired snapshots:", err.message);
  }
};

const getDatesInRange = (startStr, endStr) => {
  const dates = [];
  const [sYear, sMonth, sDay] = startStr.split("-").map(Number);
  const [eYear, eMonth, eDay] = endStr.split("-").map(Number);
  const current = new Date(sYear, sMonth - 1, sDay);
  const end = new Date(eYear, eMonth - 1, eDay);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Common stats calculator based on period and cafeNumber filter
const calculateReportStats = async (
  req,
  res,
  startDateStr,
  endDateStr,
  periodType,
) => {
  try {
    const campusId = await getCampusIdForUser(req);
    if (!campusId) {
      return res
        .status(400)
        .json({ message: "Campus ID is required or not found for this user." });
    }

    const campus = await User.findById(campusId);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found." });
    }

    const studentCampusId = campus.campusId || campus.id;

    const targetCafeNumber = req.query.cafeNumber
      ? Number(req.query.cafeNumber)
      : null;
    const targetMealType = req.query.mealType
      ? String(req.query.mealType).toLowerCase()
      : null;

    const today = getAppDayString(new Date());

    // Lock any active snapshots whose end times have passed before checking report stats
    await lockExpiredSnapshots(campusId);

    const launchDate = await getSystemLaunchDate(campusId);

    // Fetch meal schedule for the start date to get applied times
    const mealSchedule = await getMealScheduleAt(
      campusId,
      new Date(`${startDateStr}T12:00:00+03:00`),
    );

    // Extract appliedMealWindow from schedule for the selected meal type
    let appliedMealWindow = null;
    if (
      targetMealType &&
      targetMealType !== "total" &&
      mealSchedule[targetMealType]
    ) {
      appliedMealWindow = {
        start: mealSchedule[targetMealType].start,
        end: mealSchedule[targetMealType].end,
      };
    }

    let noDataReason = null;
    if (startDateStr > today) {
      noDataReason = "future";
    } else if (launchDate && endDateStr < launchDate) {
      noDataReason = "before_system_start";
    } else if (!launchDate && endDateStr < today) {
      noDataReason = "before_system_start";
    }

    // Check if a specific meal session is selected and if it's upcoming
    if (!noDataReason && targetMealType && targetMealType !== "total") {
      const sessionStatus = getMealSessionStatusSync(
        targetMealType,
        startDateStr,
        mealSchedule,
      );
      if (sessionStatus === "upcoming") {
        noDataReason = "future";
      }
    }

    if (noDataReason) {
      return res.json({
        period: {
          type: periodType,
          startDate: startDateStr,
          endDate: endDateStr,
        },
        cafeNumber: targetCafeNumber,
        mealType: targetMealType || "total",
        campusName: campus.name,
        mealSchedule,
        appliedMealWindow,
        noDataReason,
        stats: {
          totalRegular: 0,
          totalAssigned: 0,
          totalUnassigned: 0,
          totalInternships: 0,
          totalServed: 0,
          totalUnserved: 0,
          breakdown: {
            fasting: { total: 0, served: 0, unserved: 0 },
            sunday_fasting: { total: 0, served: 0, unserved: 0 },
            muslim_fasting: { total: 0, served: 0, unserved: 0 },
            not_fasting: { total: 0, served: 0, unserved: 0 },
          },
        },
      });
    }

    // Query snapshots in the range
    let snapshotQuery =
      "SELECT * FROM meal_session_snapshots WHERE campusId = ? AND date >= ? AND date <= ?";
    const snapshotParams = [campusId, startDateStr, endDateStr];
    if (targetCafeNumber) {
      snapshotQuery += " AND cafeteriaId = ?";
      snapshotParams.push(targetCafeNumber);
    }
    if (targetMealType && targetMealType !== "total") {
      snapshotQuery += " AND mealSession = ?";
      snapshotParams.push(targetMealType);
    }
    const [snapshotRows] = await getDB().execute(snapshotQuery, snapshotParams);

    // If no snapshots are found handle gracefully. For future dates mark as future,
    // for past dates attempt a fallback calculation from student assignments and scans
    // so the report shows real numbers even when snapshots weren't created.
    if (snapshotRows.length === 0) {
      if (endDateStr >= today) {
        noDataReason = "future";
        return res.json({
          period: {
            type: periodType,
            startDate: startDateStr,
            endDate: endDateStr,
          },
          cafeNumber: targetCafeNumber,
          mealType: targetMealType || "total",
          campusName: campus.name,
          mealSchedule,
          appliedMealWindow,
          noDataReason,
          stats: {
            totalRegular: 0,
            totalAssigned: 0,
            totalUnassigned: 0,
            totalInternships: 0,
            totalServed: 0,
            totalUnserved: 0,
            breakdown: {
              fasting: { total: 0, served: 0, unserved: 0 },
              sunday_fasting: { total: 0, served: 0, unserved: 0 },
              muslim_fasting: { total: 0, served: 0, unserved: 0 },
              not_fasting: { total: 0, served: 0, unserved: 0 },
            },
          },
        });
      }

      if (endDateStr < today) {
        // Fallback: calculate from students + scan history
        const studentFilter = { campusId: studentCampusId };
        let students = await CafeStudent.findAll(studentFilter);

        if (targetCafeNumber) {
          students = filterStudentsForCafeNumber(
            students,
            campus,
            targetCafeNumber,
          );
        }

        // Derive assigned/unassigned from student records (best-effort)
        let totalAssignedFallback =
          students.filter(
            (s) =>
              !s.isInternship &&
              getEffectiveStudentCafeNumber(s, campus) !== null,
          ).length || 0;
        let totalUnassignedFallback =
          students.filter(
            (s) =>
              !s.isInternship &&
              getEffectiveStudentCafeNumber(s, campus) === null,
          ).length || 0;
        let totalRegularFallback = students.length || 0;
        let totalInternshipsFallback =
          students.filter((s) => s.isInternship).length || 0;

        // Query scans across the date range
        let scanQuery =
          "SELECT studentId, fastingTypeAtScanTime FROM meal_scan_history WHERE campus = ? AND date >= ? AND date <= ?";
        const scanParams = [campusId, startDateStr, endDateStr];
        if (targetCafeNumber) {
          scanQuery += " AND cafeteria = ?";
          scanParams.push(targetCafeNumber);
        }
        if (targetMealType && targetMealType !== "total") {
          scanQuery += " AND mealSession = ?";
          scanParams.push(targetMealType);
        }
        const [scanRowsFallback] = await getDB().execute(scanQuery, scanParams);

        const uniqueServed = new Set();
        const fastingCounts = {
          fasting: 0,
          muslim_fasting: 0,
          sunday_fasting: 0,
          not_fasting: 0,
        };
        for (const s of scanRowsFallback) {
          uniqueServed.add(s.studentId);
          if (
            s.fastingTypeAtScanTime &&
            fastingCounts[s.fastingTypeAtScanTime] !== undefined
          ) {
            fastingCounts[s.fastingTypeAtScanTime] += 1;
          }
        }

        const totalServedFallback = uniqueServed.size;
        // If there are no cafestudents recorded for this campus, use scans to estimate assigned totals
        if (students.length === 0 && totalServedFallback > 0) {
          totalAssignedFallback = 0;
          totalUnassignedFallback = 0;
          totalRegularFallback = 0;
        }

        const totalUnservedFallback = Math.max(
          0,
          totalAssignedFallback - totalServedFallback,
        );

        const breakdownFallback = {
          fasting: {
            total: Math.max(0, fastingCounts.fasting),
            served: fastingCounts.fasting,
            unserved: Math.max(
              0,
              fastingCounts.fasting - fastingCounts.fasting,
            ),
          },
          sunday_fasting: {
            total: Math.max(0, fastingCounts.sunday_fasting),
            served: fastingCounts.sunday_fasting,
            unserved: 0,
          },
          muslim_fasting: {
            total: Math.max(0, fastingCounts.muslim_fasting),
            served: fastingCounts.muslim_fasting,
            unserved: 0,
          },
          not_fasting: {
            total: Math.max(0, fastingCounts.not_fasting),
            served: fastingCounts.not_fasting,
            unserved: 0,
          },
        };

        return res.json({
          period: {
            type: periodType,
            startDate: startDateStr,
            endDate: endDateStr,
          },
          cafeNumber: targetCafeNumber,
          mealType: targetMealType || "total",
          campusName: campus.name,
          mealSchedule,
          appliedMealWindow,
          noDataReason: null,
          stats: {
            totalRegular: totalRegularFallback,
            totalAssigned: totalAssignedFallback,
            totalUnassigned: totalUnassignedFallback,
            totalInternships: totalInternshipsFallback,
            totalServed: totalServedFallback,
            totalUnserved: totalUnservedFallback,
            breakdown: breakdownFallback,
          },
        });
      }

      // If none of the above, respond with no_meal_record
      noDataReason = "no_meal_record";
      return res.json({
        period: {
          type: periodType,
          startDate: startDateStr,
          endDate: endDateStr,
        },
        cafeNumber: targetCafeNumber,
        mealType: targetMealType || "total",
        campusName: campus.name,
        mealSchedule,
        appliedMealWindow,
        noDataReason,
        stats: {
          totalRegular: 0,
          totalAssigned: 0,
          totalUnassigned: 0,
          totalInternships: 0,
          totalServed: 0,
          totalUnserved: 0,
          breakdown: {
            fasting: { total: 0, served: 0, unserved: 0 },
            sunday_fasting: { total: 0, served: 0, unserved: 0 },
            muslim_fasting: { total: 0, served: 0, unserved: 0 },
            not_fasting: { total: 0, served: 0, unserved: 0 },
          },
        },
      });
    }

    // Merge snapshot start/end times into mealSchedule so we show the historical times
    for (const snap of snapshotRows) {
      const sessionName = snap.mealSession;
      if (mealSchedule[sessionName]) {
        mealSchedule[sessionName].start = snap.sessionStartTime;
        mealSchedule[sessionName].end = snap.sessionEndTime;
        mealSchedule[sessionName].label =
          `${snap.sessionStartTime} - ${snap.sessionEndTime}`;
      }
    }

    // Use snapshot start/end times for appliedMealWindow when a specific meal session is requested
    if (targetMealType && targetMealType !== "total") {
      const matchingSnap = snapshotRows.find(
        (row) => row.mealSession === targetMealType,
      );
      if (matchingSnap) {
        appliedMealWindow = {
          start: matchingSnap.sessionStartTime,
          end: matchingSnap.sessionEndTime,
        };
      }
    }

    // Initialize stats
    let totalStudentsCount = 0; // includes internships and unassigned (this is the UI "Total Students")
    let totalAssigned = 0; // assigned regular students (exclude internships)
    let totalUnassigned = 0; // unassigned regular students (exclude internships)
    let totalInternships = 0;
    let totalServed = 0;
    let totalUnserved = 0;

    const breakdown = {
      fasting: { total: 0, served: 0, unserved: 0 },
      sunday_fasting: { total: 0, served: 0, unserved: 0 },
      muslim_fasting: { total: 0, served: 0, unserved: 0 },
      not_fasting: { total: 0, served: 0, unserved: 0 },
    };

    const dates = getDatesInRange(startDateStr, endDateStr);
    const dayAssignedMap = new Map();

    // Preload campus students to derive totals (includes internships)
    const allStudents = await CafeStudent.findAll({
      campusId: studentCampusId,
    });

    for (const d of dates) {
      const daySnapshots = snapshotRows.filter((row) => {
        const rowDateStr = getAppDayString(
          row.date instanceof Date ? row.date : new Date(row.date),
        );
        return rowDateStr === d;
      });

      if (daySnapshots.length === 0) continue;

      // Statistics derived from cafestudents (for counts) and snapshots (for fasting breakdowns)
      const studentsForScope = targetCafeNumber
        ? filterStudentsForCafeNumber(allStudents, campus, targetCafeNumber)
        : allStudents;

      const dayAssignedFromStudents = studentsForScope.filter(
        (s) =>
          !s.isInternship && getEffectiveStudentCafeNumber(s, campus) !== null,
      ).length;
      const dayUnassignedFromStudents = !targetCafeNumber
        ? allStudents.filter(
          (s) =>
            !s.isInternship &&
            getEffectiveStudentCafeNumber(s, campus) === null,
        ).length
        : 0;
      const dayTotalStudentsFromStudents = studentsForScope.length; // includes internships

      const snapshotTotalStudents = daySnapshots.reduce(
        (sum, row) => sum + (Number(row.totalStudents) || 0),
        0,
      );
      const snapshotAssignedStudents = daySnapshots.reduce(
        (sum, row) => sum + (Number(row.assignedStudents) || 0),
        0,
      );
      const snapshotUnassignedStudents = !targetCafeNumber
        ? Math.max(
          ...daySnapshots.map((row) => Number(row.unassignedStudents) || 0),
          0,
        )
        : 0;

      let dayTotalStudents =
        snapshotTotalStudents > 0
          ? snapshotTotalStudents
          : dayTotalStudentsFromStudents;
      let dayAssigned =
        snapshotAssignedStudents > 0
          ? snapshotAssignedStudents
          : dayAssignedFromStudents;
      let dayUnassigned =
        snapshotUnassignedStudents > 0
          ? snapshotUnassignedStudents
          : dayUnassignedFromStudents;
      const dayInternships = studentsForScope.filter((s) => s.isInternship).length;

      // Fasting counts: prefer snapshot values if present, else estimate from students
      let dayOrthodox = 0;
      let dayMuslim = 0;
      let daySunday = 0;
      let dayNotFasting = 0;

      if (daySnapshots.length > 0) {
        for (const row of daySnapshots) {
          let snapOrthodox = Number(row.orthodoxFastingCount) || 0;
          let snapMuslim = Number(row.muslimFastingCount) || 0;
          let snapSunday = Number(row.sundayFastingCount) || 0;
          let snapNotFasting = Number(row.notFastingCount) || 0;

          const rowDateStr = getAppDayString(
            row.date instanceof Date ? row.date : new Date(row.date),
          );
          if (rowDateStr === today || snapOrthodox + snapMuslim + snapSunday + snapNotFasting === 0) {
            const currentOrthodox = studentsForScope.filter(
              (s) => s.fastingType === "fasting",
            ).length;
            const currentMuslim = studentsForScope.filter(
              (s) => s.fastingType === "muslim_fasting",
            ).length;
            const currentSunday = studentsForScope.filter(
              (s) => s.fastingType === "sunday_fasting",
            ).length;
            const currentNotFasting = studentsForScope.filter(
              (s) => s.fastingType === "not_fasting",
            ).length;

            if (
              currentOrthodox !== snapOrthodox ||
              currentMuslim !== snapMuslim ||
              currentSunday !== snapSunday ||
              currentNotFasting !== snapNotFasting
            ) {
              snapOrthodox = currentOrthodox;
              snapMuslim = currentMuslim;
              snapSunday = currentSunday;
              snapNotFasting = currentNotFasting;

              // Save the updated counts back to the snapshot in the database
              await getDB().execute(
                "UPDATE meal_session_snapshots SET orthodoxFastingCount = ?, muslimFastingCount = ?, sundayFastingCount = ?, notFastingCount = ? WHERE id = ?",
                [snapOrthodox, snapMuslim, snapSunday, snapNotFasting, row.id],
              ).catch((e) => {
                console.error("Failed to update snapshot fasting counts:", e.message);
              });
            }
          }

          dayOrthodox += snapOrthodox;
          dayMuslim += snapMuslim;
          daySunday += snapSunday;
          dayNotFasting += snapNotFasting;
        }
      } else {
        dayOrthodox = studentsForScope.filter(
          (s) => s.fastingType === "fasting",
        ).length;
        dayMuslim = studentsForScope.filter(
          (s) => s.fastingType === "muslim_fasting",
        ).length;
        daySunday = studentsForScope.filter(
          (s) => s.fastingType === "sunday_fasting",
        ).length;
        dayNotFasting = studentsForScope.filter(
          (s) => s.fastingType === "not_fasting",
        ).length;
      }

      // Query scans for served statistics and served fasting breakdown from MealScanHistory
      let scanQuery =
        "SELECT studentId, fastingTypeAtScanTime, mealSession FROM meal_scan_history WHERE campus = ? AND date = ?";
      const scanParams = [campusId, d];
      if (targetCafeNumber) {
        scanQuery += " AND cafeteria = ?";
        scanParams.push(targetCafeNumber);
      }
      if (targetMealType && targetMealType !== "total") {
        scanQuery += " AND mealSession = ?";
        scanParams.push(targetMealType);
      }

      const [scanRows] = await getDB().execute(scanQuery, scanParams);

      // Deduplicate scans by studentId
      // For a single meal session we dedupe across the day (scanRows already filtered by mealSession),
      // but for "total" (all sessions) the UI expects the SUM of per-session served counts
      // (i.e. count unique served students per session and then sum), not the unique
      // students across the whole day. Compute both depending on selected meal type.
      let dayServed = 0;
      let dayServedFasting = 0;
      let dayServedMuslim = 0;
      let dayServedSunday = 0;
      let dayServedNotFasting = 0;

      if (targetMealType && targetMealType !== "total") {
        // existing behavior: unique students for the selected session
        const uniqueServedScans = [];
        const seenStudents = new Set();
        for (const scan of scanRows) {
          if (!seenStudents.has(scan.studentId)) {
            seenStudents.add(scan.studentId);
            uniqueServedScans.push(scan);
          }
        }

        dayServed = uniqueServedScans.length;
        dayServedFasting = uniqueServedScans.filter(
          (s) => s.fastingTypeAtScanTime === "fasting",
        ).length;
        dayServedMuslim = uniqueServedScans.filter(
          (s) => s.fastingTypeAtScanTime === "muslim_fasting",
        ).length;
        dayServedSunday = uniqueServedScans.filter(
          (s) => s.fastingTypeAtScanTime === "sunday_fasting",
        ).length;
        dayServedNotFasting = uniqueServedScans.filter(
          (s) => s.fastingTypeAtScanTime === "not_fasting",
        ).length;
      } else {
        // total across sessions: prefer snapshot served totals when available
        const snapshotServedSum = daySnapshots.reduce(
          (acc, r) => acc + (Number(r.servedCount) || 0),
          0,
        );
        if (snapshotServedSum > 0) {
          dayServed = snapshotServedSum;
          // snapshots don't currently include served fasting breakdown reliably,
          // fall back to scan grouping below for breakdown values
        }

        // Group scans by mealSession, count unique studentIds per session and sum
        const sessions = new Map();
        for (const s of scanRows) {
          const sessionKey = s.mealSession || "__all__";
          let entry = sessions.get(sessionKey);
          if (!entry) {
            entry = {
              students: new Set(),
              fastingSets: {
                fasting: new Set(),
                muslim_fasting: new Set(),
                sunday_fasting: new Set(),
                not_fasting: new Set(),
              },
            };
            sessions.set(sessionKey, entry);
          }
          const sid = String(s.studentId);
          entry.students.add(sid);
          const ft = s.fastingTypeAtScanTime || "not_fasting";
          if (entry.fastingSets[ft]) entry.fastingSets[ft].add(sid);
        }

        let sumServed = 0;
        let sumFasting = 0;
        let sumMuslim = 0;
        let sumSunday = 0;
        let sumNotFasting = 0;
        for (const entry of sessions.values()) {
          sumServed += entry.students.size;
          sumFasting += entry.fastingSets.fasting.size;
          sumMuslim += entry.fastingSets.muslim_fasting.size;
          sumSunday += entry.fastingSets.sunday_fasting.size;
          sumNotFasting += entry.fastingSets.not_fasting.size;
        }

        if (dayServed === 0) dayServed = sumServed;
        dayServedFasting = sumFasting;
        dayServedMuslim = sumMuslim;
        dayServedSunday = sumSunday;
        dayServedNotFasting = sumNotFasting;
      }

      // If student records exist but snapshot totals are zero, preserve student-based estimates.
      if (studentsForScope && studentsForScope.length > 0) {
        if (dayTotalStudents === 0) {
          dayTotalStudents = dayTotalStudentsFromStudents;
        }
        if (dayAssigned === 0) {
          dayAssigned = dayAssignedFromStudents;
        }
        if (!targetCafeNumber && dayUnassigned === 0) {
          dayUnassigned = dayUnassignedFromStudents;
        }
      }

      dayAssignedMap.set(d, dayAssigned);

      totalStudentsCount += dayTotalStudents;
      totalAssigned += dayAssigned;
      totalUnassigned += dayUnassigned;
      totalInternships += dayInternships;
      totalServed += dayServed;

      // Fasting totals and served values
      const fastingTotal = Math.max(dayOrthodox, dayServedFasting);
      const muslimTotal = Math.max(dayMuslim, dayServedMuslim);
      const sundayTotal = Math.max(daySunday, dayServedSunday);
      const notFastingTotal = Math.max(dayNotFasting, dayServedNotFasting);

      breakdown.fasting.total += fastingTotal;
      breakdown.fasting.served += dayServedFasting;

      breakdown.muslim_fasting.total += muslimTotal;
      breakdown.muslim_fasting.served += dayServedMuslim;

      breakdown.sunday_fasting.total += sundayTotal;
      breakdown.sunday_fasting.served += dayServedSunday;

      breakdown.not_fasting.total += notFastingTotal;
      breakdown.not_fasting.served += dayServedNotFasting;
    }

    // Compute unserved for all types
    Object.keys(breakdown).forEach((key) => {
      breakdown[key].unserved = Math.max(
        0,
        breakdown[key].total - breakdown[key].served,
      );
    });

    // Sum per-session unserved across all dates/sessions.
    // Approach: group snapshots by date+mealSession and scans by date+mealSession,
    // compute per-session assigned (from snapshot.assignedStudents if present),
    // per-session served (prefer snapshot.servedCount, else use unique scans),
    // then per-session unserved = snap.unservedCount (if present and >0) else max(0, assigned - served).
    // Finally sum these per-session unserved values.
    let summedUnserved = 0;

    // Fetch scans across the date range to use as fallback for served per session
    let rangeScanQuery =
      "SELECT studentId, mealSession, date FROM meal_scan_history WHERE campus = ? AND date >= ? AND date <= ?";
    const rangeScanParams = [campusId, startDateStr, endDateStr];
    if (targetCafeNumber) {
      rangeScanQuery += " AND cafeteria = ?";
      rangeScanParams.push(targetCafeNumber);
    }
    if (targetMealType && targetMealType !== "total") {
      rangeScanQuery += " AND mealSession = ?";
      rangeScanParams.push(targetMealType);
    }
    const [rangeScanRows] = await getDB().execute(
      rangeScanQuery,
      rangeScanParams,
    );

    // Build maps keyed by `${date}|${mealSession}`
    const snapMap = new Map();
    for (const snap of snapshotRows) {
      const rowDateStr = getAppDayString(
        snap.date instanceof Date ? snap.date : new Date(snap.date),
      );
      const key = `${rowDateStr}|${snap.mealSession || "__all__"}`;
      // If multiple snapshots exist for same date+session (different cafeterias), sum assigned/served/unserved
      const existing = snapMap.get(key) || {
        assigned: 0,
        served: 0,
        unserved: 0,
      };
      existing.assigned += Number(snap.assignedStudents) || 0;
      existing.served += Number(snap.servedCount) || 0;
      existing.unserved += Number(snap.unservedCount) || 0;
      snapMap.set(key, existing);
    }

    const scanMap = new Map();
    for (const s of rangeScanRows) {
      const rowDateStr = getAppDayString(
        s.date instanceof Date ? s.date : new Date(s.date),
      );
      const key = `${rowDateStr}|${s.mealSession || "__all__"}`;
      let set = scanMap.get(key);
      if (!set) {
        set = new Set();
        scanMap.set(key, set);
      }
      set.add(String(s.studentId));
    }

    // Union keys
    const keys = new Set([...snapMap.keys(), ...scanMap.keys()]);
    for (const key of keys) {
      const snapEntry = snapMap.get(key) || {
        assigned: 0,
        served: 0,
        unserved: 0,
      };
      const scansSet = scanMap.get(key) || new Set();
      const assigned =
        snapEntry.assigned || dayAssignedMap.get(key.split("|")[0]) || 0;
      const served = snapEntry.served || scansSet.size || 0;
      const perSessionUnserved =
        snapEntry.unserved > 0
          ? snapEntry.unserved
          : Math.max(0, assigned - served);
      summedUnserved += perSessionUnserved;
    }

    // If we found any per-session unserved values, use the sum, otherwise fall back to assigned-served.
    if (summedUnserved > 0) {
      totalUnserved = summedUnserved;
    } else {
      totalUnserved = Math.max(0, totalAssigned - totalServed);
    }

    res.json({
      period: {
        type: periodType,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      cafeNumber: targetCafeNumber,
      mealType: targetMealType || "total",
      campusName: campus.name,
      mealSchedule,
      appliedMealWindow,
      noDataReason,
      stats: {
        // `totalRegular` kept for UI compatibility: represents total students (includes internships)
        totalRegular: totalStudentsCount,
        totalAssigned,
        totalUnassigned,
        totalInternships,
        totalServed,
        totalUnserved,
        breakdown,
      },
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
  const month = req.query.month || new Date().getMonth() + 1;
  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  await calculateReportStats(req, res, startDateStr, endDateStr, "monthly");
};
