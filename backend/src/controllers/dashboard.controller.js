import User from "../models/user.model.js";
import CafeStudent from "../models/cafeStudent.model.js";
import Meal from "../models/meal.model.js";
import StationScan from "../models/stationScan.model.js";
import {
  getCurrentSemester,
  getCurrentYear,
  getDateFromDayString,
  getDayString,
  getMealSnapshotCutoff,
  getMealScheduleAt,
  getMealSessionStatus,
  getMealSessionWindow,
  isCampusLiveNow,
  syncCampusLiveMealWindow,
} from "../utils/mealSession.js";
import {
  getStudentFastingType,
  getStudentIsInternship,
  normalizeStudent,
} from "../utils/studentDefaults.js";
import {
  getStudentCampusQuery,
  getStudentCampusSyncQuery,
} from "../utils/campusId.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";
import {
  filterStudentsForCafeNumber,
  getCafeDisplayName,
} from "../utils/cafeScope.js";

const findOwnedCampus = async (campusId, userId) => {
  const campus = await User.findById(campusId);
  if (
    !campus ||
    campus.role !== "campus" ||
    Number(campus.createdBy) !== Number(userId)
  ) {
    return null;
  }
  return campus;
};

const attachAdminLogoToCampus = async (campus) => {
  if (!campus) {
    return campus;
  }

  const admin = campus.createdBy ? await User.findById(campus.createdBy) : null;

  return {
    ...campus,
    logo: admin?.logo || campus.logo,
  };
};

const buildFastingBreakdown = (students = []) => ({
  fasting: students.filter(
    (student) => getStudentFastingType(student) === "fasting",
  ).length,
  sundayFasting: students.filter(
    (student) => getStudentFastingType(student) === "sunday_fasting",
  ).length,
  muslimFasting: students.filter(
    (student) => getStudentFastingType(student) === "muslim_fasting",
  ).length,
  notFasting: students.filter(
    (student) => getStudentFastingType(student) === "not_fasting",
  ).length,
});

const buildMealSummarySnapshot = (
  campusStudents = [],
  servedStudentIds = [],
) => {
  const regularStudentsList = campusStudents.filter(
    (student) => !getStudentIsInternship(student),
  );
  const internshipStudentsList = campusStudents.filter((student) =>
    getStudentIsInternship(student),
  );
  const servedStudentIdSet = new Set(servedStudentIds.map(String));
  const servedRegularStudentsList = regularStudentsList.filter((student) =>
    servedStudentIdSet.has(String(student.studentId)),
  );
  const pendingRegularStudentsList = regularStudentsList.filter(
    (student) => !servedStudentIdSet.has(String(student.studentId)),
  );

  return {
    totalStudents: campusStudents.length,
    regularStudents: regularStudentsList.length,
    internshipStudents: internshipStudentsList.length,
    servedStudents: servedRegularStudentsList.length,
    pendingStudents: pendingRegularStudentsList.length,
    fastingBreakdown: buildFastingBreakdown(campusStudents),
    regularFastingBreakdown: buildFastingBreakdown(regularStudentsList),
    internshipFastingBreakdown: buildFastingBreakdown(internshipStudentsList),
    servedFastingBreakdown: buildFastingBreakdown(servedRegularStudentsList),
    pendingFastingBreakdown: buildFastingBreakdown(pendingRegularStudentsList),
  };
};

const buildServedOnlySummarySnapshot = (studentSnapshots = []) => {
  const servedStudents = studentSnapshots.filter(
    (student) => !getStudentIsInternship(student),
  );

  return {
    totalStudents: null,
    regularStudents: null,
    internshipStudents: null,
    servedStudents: servedStudents.length,
    pendingStudents: null,
    fastingBreakdown: null,
    regularFastingBreakdown: null,
    internshipFastingBreakdown: null,
    servedFastingBreakdown: buildFastingBreakdown(servedStudents),
    pendingFastingBreakdown: null,
  };
};

const getAppliedWindowDate = (dayString, timeValue) => {
  if (!dayString || typeof timeValue !== "string") {
    return null;
  }

  const date = new Date(`${dayString}T${timeValue}:00+03:00`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveActualMealWindow = async ({
  campusId,
  mealType,
  queryDate,
  sessionStatus,
  meal,
}) => {
  if (!meal) {
    return {
      openedAt: null,
      closedAt: null,
    };
  }

  const appliedWindow = meal.appliedWindow || {};
  let openedAt = appliedWindow.actualOpenedAt || meal.createdAt || null;
  const storedOpenedAt = openedAt;
  let closedAt = appliedWindow.actualClosedAt || null;
  const storedClosedAt = closedAt;
  const queryDayString = getDayString(queryDate);
  const appliedStartAt = getAppliedWindowDate(
    queryDayString,
    appliedWindow.start,
  );
  const appliedEndAt = getAppliedWindowDate(queryDayString, appliedWindow.end);
  const capOpenedAt = (value) => {
    if (!value) return null;

    const openedDate = new Date(value);
    if (Number.isNaN(openedDate.getTime())) {
      return null;
    }

    if (appliedStartAt && openedDate < appliedStartAt) {
      return appliedStartAt.toISOString();
    }

    if (appliedEndAt && openedDate > appliedEndAt) {
      return appliedEndAt.toISOString();
    }

    return value;
  };
  const capClosedAt = (value) => {
    if (!value) return null;

    const closedDate = new Date(value);
    if (Number.isNaN(closedDate.getTime())) {
      return null;
    }

    if (appliedEndAt && closedDate > appliedEndAt) {
      return appliedEndAt.toISOString();
    }

    return value;
  };
  const isValidClosedAt = (value) => {
    if (!value) return false;

    const openedDate = openedAt ? new Date(openedAt) : null;
    const closedDate = new Date(value);

    if (Number.isNaN(closedDate.getTime())) {
      return false;
    }

    if (getDayString(closedDate) !== queryDayString) {
      return false;
    }

    return (
      !openedDate ||
      Number.isNaN(openedDate.getTime()) ||
      closedDate.getTime() >= openedDate.getTime()
    );
  };

  openedAt = capOpenedAt(openedAt);
  closedAt = capClosedAt(closedAt);

  if (
    (storedOpenedAt && openedAt && openedAt !== storedOpenedAt) ||
    (storedClosedAt && closedAt && closedAt !== storedClosedAt)
  ) {
    await Meal.updateById(meal.id, {
      appliedWindow: {
        ...appliedWindow,
        actualOpenedAt: openedAt,
        actualClosedAt: closedAt,
      },
    }).catch(() => null);
  }

  if (closedAt && !isValidClosedAt(closedAt)) {
    closedAt = null;

    await Meal.updateById(meal.id, {
      appliedWindow: {
        ...appliedWindow,
        actualOpenedAt: openedAt,
        actualClosedAt: null,
      },
    }).catch(() => null);
  }

  if (!closedAt && sessionStatus === "completed") {
    const latestScan = await StationScan.findOne({
      campus: campusId,
      date: getDayString(queryDate),
      mealType,
      orderByCreatedAtDesc: true,
    });

    closedAt = latestScan?.scannedAt || latestScan?.createdAt || null;
    closedAt = capClosedAt(closedAt);
    if (!isValidClosedAt(closedAt)) {
      closedAt = null;
    }

    if (closedAt) {
      await Meal.updateById(meal.id, {
        appliedWindow: {
          ...appliedWindow,
          actualOpenedAt: openedAt,
          actualClosedAt: closedAt,
        },
      });
    }
  }

  return {
    openedAt,
    closedAt,
  };
};

const resolveDashboardSessionStatus = ({
  scheduleStatus,
  actualMealWindow,
  campus,
  cafeNumber = null,
  currentDate = new Date(),
}) => {
  if (scheduleStatus !== "active") {
    return scheduleStatus;
  }

  // Consider campus live only if the campus reports being online and the
  // active cafe number matches the requested cafe number.
  const campusIsLive = isCampusLiveNow(campus, currentDate);
  const campusActiveCafe = campus?.activeCafeNumber ?? null;

  if (
    campusIsLive &&
    campusActiveCafe &&
    cafeNumber &&
    campusActiveCafe === cafeNumber
  ) {
    return "active";
  }

  if (actualMealWindow?.openedAt) {
    return "logged_out";
  }

  return "not_opened";
};

export const getAdminDashboard = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const scanTime = new Date();
    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
    }).format(scanTime);
    const today = new Date(`${todayString}T00:00:00+03:00`);

    const year = getCurrentYear(today);
    const semester = getCurrentSemester(today);

    const campuses = await User.findAll({ role: "campus", createdBy: req.userId });

    let totalStudents = 0;
    let totalServed = 0;

    const campusesWithStats = await Promise.all(
      campuses.map(async (campus) => {
        const studentsCount = await CafeStudent.countDocuments(
          getStudentCampusSyncQuery(campus),
        );

        const todaysMeals = await Meal.findAll({
          campus: campus.id,
          date: getDayString(today),
          year,
          semester,
        });

        const servedCount = new Set();
        todaysMeals.forEach((meal) => {
          (meal.students || []).forEach((studentId) =>
            servedCount.add(String(studentId)),
          );
        });

        totalStudents += studentsCount;
        totalServed += servedCount.size;
        const brandedCampus = await attachAdminLogoToCampus(campus);

        return {
          ...brandedCampus,
          students: studentsCount,
          served: servedCount.size,
        };
      }),
    );

    res.json({
      stats: {
        campuses: campuses.length,
        totalStudents,
        servedToday: totalServed,
        pendingStudents: Math.max(totalStudents - totalServed, 0),
      },
      campuses: campusesWithStats,
    });
  } catch (err) {
    logInternalError("admin-dashboard", err);
    sendServerError(
      res,
      "We could not load the dashboard right now. Please try again.",
    );
  }
};

export const getMeals = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }

    const scanTime = new Date();

    const { year, semester, date, mealType, cafeNumber } = req.query;
    const campusId = req.userRole === "campus" ? req.userId : req.query.campusId;

    if (!campusId || !date || !mealType) {
      return res.status(400).json({
        message: "campusId, date, and mealType are required",
      });
    }

    const campus = req.userRole === "campus"
      ? req.user
      : await findOwnedCampus(campusId, req.userId);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }
    const normalizedCafeNumber =
      cafeNumber !== undefined && cafeNumber !== null && cafeNumber !== ""
        ? Number(cafeNumber)
        : null;

    const studentCampusQuery = getStudentCampusQuery(campus);
    const queryDate = getDateFromDayString(date);
    const queryDayString = getDayString(queryDate);

    const resolvedYear =
      year && !Number.isNaN(Number(year))
        ? Number(year)
        : getCurrentYear(queryDate);
    const resolvedSemester = semester || getCurrentSemester(queryDate);

    let meal = await Meal.findOne({
      campus: Number(campusId),
      cafeNumber: normalizedCafeNumber,
      year: resolvedYear,
      semester: resolvedSemester,
      date: queryDayString,
      mealType,
    });
    const scheduleStatus = await getMealSessionStatus(
      campus.id,
      mealType,
      queryDate,
      scanTime,
    );
    if (scheduleStatus === "active" && isCampusLiveNow(campus)) {
      meal =
        (await syncCampusLiveMealWindow(campus.id, scanTime, {
          onlineSince: campus.lastActiveAt,
          cafeNumber: normalizedCafeNumber,
        }).catch(() => null)) || meal;
    }
    const snapshotCutoff = await getMealSnapshotCutoff(
      campus.id,
      mealType,
      queryDate,
    );
    const sessionWindow = meal?.appliedWindow
      ? (() => {
          return {
            start: new Date(
              `${queryDayString}T${meal.appliedWindow.start}:00+03:00`,
            ),
            end: new Date(
              `${queryDayString}T${meal.appliedWindow.end}:00+03:00`,
            ),
          };
        })()
      : await getMealSessionWindow(campus.id, mealType, queryDate);
    const trackingStartAt = campus.createdAt
      ? new Date(campus.createdAt)
      : null;
    const isBeforeSystemStart =
      Boolean(snapshotCutoff && sessionWindow?.end && trackingStartAt) &&
      sessionWindow.end < trackingStartAt;
    const actualMealWindow = await resolveActualMealWindow({
      campusId: campus.id,
      mealType,
      queryDate,
      sessionStatus: scheduleStatus,
      meal,
    });
    const sessionStatus = resolveDashboardSessionStatus({
      scheduleStatus,
      actualMealWindow,
      campus,
      cafeNumber: normalizedCafeNumber,
      currentDate: scanTime,
    });
    if (sessionStatus === "active") {
      actualMealWindow.closedAt = null;
    }
    const isLiveSession =
      sessionStatus === "active" || sessionStatus === "logged_out";
    const shouldUseStoredHistoryOnly = !isLiveSession;

    let summarySnapshot = meal?.summarySnapshot || null;
    if (isLiveSession && !summarySnapshot) {
      const campusStudents = filterStudentsForCafeNumber(
        await CafeStudent.findAll(studentCampusQuery),
        campus,
        normalizedCafeNumber,
      );
      summarySnapshot = buildMealSummarySnapshot(
        campusStudents,
        meal?.students || [],
      );
    }
    if (
      shouldUseStoredHistoryOnly &&
      !summarySnapshot &&
      Array.isArray(meal?.studentSnapshots) &&
      meal.studentSnapshots.length > 0
    ) {
      summarySnapshot = buildServedOnlySummarySnapshot(meal.studentSnapshots);
    }

    const hasStoredHistoricalSnapshot = Boolean(
      meal && (meal.summarySnapshot || meal.appliedWindow),
    );
    const hasSnapshotData = isLiveSession
      ? true
      : Boolean(snapshotCutoff) &&
        !isBeforeSystemStart &&
        hasStoredHistoricalSnapshot;
    const noDataReason = isLiveSession
      ? null
      : !snapshotCutoff
        ? "upcoming"
        : isBeforeSystemStart
          ? "before_system_start"
          : !meal
            ? "no_meal_record"
            : !meal.summarySnapshot
              ? "snapshot_missing"
              : null;

    const mealSchedule =
      hasSnapshotData || sessionStatus === "not_opened"
        ? await getMealScheduleAt(campus.id, queryDate)
        : null;
    const campusSnapshot = meal?.campusSnapshot || null;

    res.json({
      summary: {
        campusId: campusSnapshot?.campusId || campus.campusId,
        campusName: campusSnapshot?.campusName || campus.name,
        cafeNumber: campusSnapshot?.cafeNumber ?? normalizedCafeNumber ?? null,
        cafeDisplayName:
          campusSnapshot?.cafeDisplayName ||
          getCafeDisplayName(campus.name, normalizedCafeNumber),
        date: queryDate,
        mealType,
        year: resolvedYear,
        semester: resolvedSemester,
        isFutureDate: sessionStatus === "upcoming",
        totalStudents: hasSnapshotData
          ? (summarySnapshot?.totalStudents ?? null)
          : null,
        regularStudents: hasSnapshotData
          ? (summarySnapshot?.regularStudents ?? null)
          : null,
        internshipStudents: hasSnapshotData
          ? (summarySnapshot?.internshipStudents ?? null)
          : null,
        fastingBreakdown: hasSnapshotData
          ? summarySnapshot?.fastingBreakdown || null
          : null,
        regularFastingBreakdown: hasSnapshotData
          ? summarySnapshot?.regularFastingBreakdown || null
          : null,
        internshipFastingBreakdown: hasSnapshotData
          ? summarySnapshot?.internshipFastingBreakdown || null
          : null,
        servedFastingBreakdown: hasSnapshotData
          ? summarySnapshot?.servedFastingBreakdown || null
          : null,
        notServedFastingBreakdown: hasSnapshotData
          ? summarySnapshot?.pendingFastingBreakdown || null
          : null,
        servedStudents: hasSnapshotData
          ? (summarySnapshot?.servedStudents ?? null)
          : null,
        notServedStudents: hasSnapshotData
          ? (summarySnapshot?.pendingStudents ?? null)
          : null,
        sessionStatus,
        mealSchedule,
        appliedMealWindow:
          meal?.appliedWindow || mealSchedule?.[mealType] || null,
        actualMealWindow,
        hasSnapshotData,
        noDataReason,
      },
    });
  } catch (err) {
    logInternalError("dashboard-meals", err);
    sendServerError(
      res,
      "We could not load meal history right now. Please try again.",
    );
  }
};

export const getMealStudents = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { date, mealType, cafeNumber, year, semester } = req.query;
    const campusId = req.userRole === "campus" ? req.userId : req.query.campusId;
    if (!campusId || !date || !mealType) {
      return res.status(400).json({
        message: "campusId, date, and mealType are required",
      });
    }

    const campus = req.userRole === "campus"
      ? req.user
      : await findOwnedCampus(campusId, req.userId);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const normalizedCafeNumber =
      cafeNumber !== undefined && cafeNumber !== null && cafeNumber !== ""
        ? Number(cafeNumber)
        : null;

    const queryDate = getDateFromDayString(date);
    const queryDayString = getDayString(queryDate);
    const resolvedYear =
      year && !Number.isNaN(Number(year))
        ? Number(year)
        : getCurrentYear(queryDate);
    const resolvedSemester = semester || getCurrentSemester(queryDate);

    const meal = await Meal.findOne({
      campus: Number(campusId),
      cafeNumber: normalizedCafeNumber,
      year: resolvedYear,
      semester: resolvedSemester,
      date: queryDayString,
      mealType,
    });

    if (!meal) {
      return res.status(404).json({ message: "Meal history not found" });
    }

    let students = await CafeStudent.findAll(getStudentCampusQuery(campus));
    students = filterStudentsForCafeNumber(
      students,
      campus,
      normalizedCafeNumber,
    );

    const servedStudentIds = new Set(
      (Array.isArray(meal.students) ? meal.students : []).map(String),
    );

    const snapshotsByStudentId = new Map(
      (Array.isArray(meal.studentSnapshots) ? meal.studentSnapshots : []).map(
        (snapshot) => [String(snapshot.studentId), snapshot],
      ),
    );

    const exportStudents = students
      .map((student) => {
        const normalized = normalizeStudent(student);
        const id = String(normalized.studentId || "");
        const snapshot = snapshotsByStudentId.get(id);

        return {
          studentId: normalized.studentId || "",
          name: normalized.name || "",
          department: normalized.department || "",
          batch: normalized.batch ?? "",
          fastingType: normalized.fastingType || "",
          isInternship: normalized.isInternship || false,
          status: servedStudentIds.has(id) ? "served" : "pending",
          scannedAt: snapshot?.scannedAt || "",
        };
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    res.json({
      students: exportStudents,
      campusName: campus.name,
      cafeNumber: normalizedCafeNumber,
    });
  } catch (err) {
    logInternalError("dashboard-meal-students", err);
    sendServerError(res, "We could not load meal student data right now.");
  }
};

export const getMealFilters = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "campus") {
      return res.status(403).json({ message: "Access denied" });
    }

    const campusId = req.userRole === "campus" ? req.userId : req.query.campusId;

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = req.userRole === "campus"
      ? req.user
      : await findOwnedCampus(campusId, req.userId);
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const meals = await Meal.findAll({ campus: Number(campusId) });
    const filters = Array.from(
      new Map(
        meals
          .sort((a, b) =>
            b.year !== a.year
              ? b.year - a.year
              : String(b.semester).localeCompare(String(a.semester)),
          )
          .map((meal) => [
            `${meal.year}-${meal.semester}`,
            {
              year: meal.year,
              semester: meal.semester,
            },
          ]),
      ).values(),
    );

    res.json({ filters });
  } catch (err) {
    logInternalError("dashboard-meal-filters", err);
    sendServerError(
      res,
      "We could not load meal filters right now. Please try again.",
    );
  }
};
