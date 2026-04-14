import StationScan from "../models/stationScan.model.js";
import Student from "../models/student.model.js";
import Meal from "../models/meal.model.js";
import {
  finalizeExpiredStationScans,
  getCurrentMealType,
  getDashboardMealContext,
  getCurrentSemester,
  getCurrentYear,
  getDayString,
  getMealSnapshotCutoff,
  getMealSchedule,
} from "../utils/mealSession.js";
import {
  ensureStudentDefaults,
  getStudentFastingType,
  getStudentIsInternship,
  normalizeStudent,
} from "../utils/studentDefaults.js";
import { logInternalError, sendServerError } from "../utils/safeError.js";

export const scanStudentStation = async (req, res) => {
  try {
    const { studentId } = req.body;

    await finalizeExpiredStationScans(req.campus._id);
    await ensureStudentDefaults(Student, { campus: req.campus._id });

    const currentMealType = await getCurrentMealType();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = getDayString(today);

    if (!currentMealType) {
      return res.status(400).json({
        allowed: false,
        message: "Time is up / áˆ°á‹“á‰µ áŠ áˆá‰‹áˆ",
      });
    }

    const student = await Student.findOne({
      studentId,
      campus: req.campus._id,
    }).select(
      "name studentId department batch fastingType profileUrl isInternship",
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const normalizedStudent = normalizeStudent(student);

    if (getStudentIsInternship(normalizedStudent)) {
      return res.json({
        allowed: false,
        message: "Internship students are not allowed to scan",
        student: normalizedStudent,
      });
    }

    const existingStationScan = await StationScan.findOne({
      student: student._id,
      campus: req.campus._id,
      date: todayString,
      mealType: currentMealType,
    });

    if (existingStationScan) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate This Meal",
        student: normalizedStudent,
      });
    }

    const stationScan = await StationScan.create({
      student: student._id,
      campus: req.campus._id,
      date: todayString,
      mealType: currentMealType,
    });

    await Meal.updateOne(
      {
        campus: req.campus._id,
        mealType: currentMealType,
        date: today,
      },
      {
        $setOnInsert: {
          campus: req.campus._id,
          mealType: currentMealType,
          date: today,
          year: getCurrentYear(today),
          semester: getCurrentSemester(today),
        },
        $addToSet: {
          students: student._id,
        },
      },
      { upsert: true },
    );

    res.json({
      allowed: true,
      message: "Allowed to Eat",
      student: normalizedStudent,
      mealType: currentMealType,
      stationScanId: stationScan._id,
    });
  } catch (err) {
    logInternalError("station-scan", err);
    if (err.code === 11000) {
      return res.json({
        allowed: false,
        message: "Not Allowed - Already Ate This Meal",
      });
    }
    sendServerError(res, "We could not complete the scan. Please try again.");
  }
};

export const getCampusDashboardStats = async (req, res) => {
  try {
    const campusId = req.campus._id;

    await finalizeExpiredStationScans(campusId);
    await ensureStudentDefaults(Student, { campus: campusId });

    const now = new Date();
    const { mealType, label, targetDate } = await getDashboardMealContext(now);
    const mealDate = new Date(targetDate);
    mealDate.setHours(0, 0, 0, 0);
    const snapshotCutoff = await getMealSnapshotCutoff(mealType, mealDate, now);
    const year = getCurrentYear(mealDate);
    const semester = getCurrentSemester(mealDate);
    const mealSchedule = await getMealSchedule();

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

    const getStudentEffectiveCreatedAt = (student) => {
      if (student.createdAt) {
        return new Date(student.createdAt);
      }

      if (student._id && typeof student._id.getTimestamp === "function") {
        return student._id.getTimestamp();
      }

      return null;
    };

    const campusStudents = await Student.find({ campus: campusId })
      .select("_id fastingType isInternship createdAt")
      .lean();

    const snapshotStudents = snapshotCutoff
      ? campusStudents.filter((student) => {
          const effectiveCreatedAt = getStudentEffectiveCreatedAt(student);
          return effectiveCreatedAt && effectiveCreatedAt <= snapshotCutoff;
        })
      : [];

    const totalStudents = snapshotStudents.length;
    const regularStudentsList = snapshotStudents.filter(
      (student) => !getStudentIsInternship(student),
    );
    const internshipStudentsList = snapshotStudents.filter((student) =>
      getStudentIsInternship(student),
    );

    const meal = await Meal.findOne({
      campus: campusId,
      date: mealDate,
      year,
      semester,
      mealType,
    }).populate("students", "name");

    const servedStudentIdSet = new Set(
      (meal?.students || []).map((student) => student._id.toString()),
    );
    const recentScans = await StationScan.find({
      campus: campusId,
      date: getDayString(mealDate),
      mealType,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("student", "name")
      .lean();

    const servedRegularStudentsList = regularStudentsList.filter((student) =>
      servedStudentIdSet.has(student._id.toString()),
    );
    const pendingRegularStudentsList = regularStudentsList.filter(
      (student) => !servedStudentIdSet.has(student._id.toString()),
    );

    res.json({
      mealType,
      mealLabel: label,
      mealSchedule,
      mealDate,
      totalStudents,
      regularStudents: regularStudentsList.length,
      internshipStudents: internshipStudentsList.length,
      servedStudents: servedRegularStudentsList.length,
      pendingStudents: pendingRegularStudentsList.length,
      fastingBreakdown: buildFastingBreakdown(campusStudents),
      regularFastingBreakdown: buildFastingBreakdown(regularStudentsList),
      internshipFastingBreakdown: buildFastingBreakdown(internshipStudentsList),
      servedFastingBreakdown: buildFastingBreakdown(servedRegularStudentsList),
      pendingFastingBreakdown: buildFastingBreakdown(pendingRegularStudentsList),
      recentScans: recentScans.map((scan) => ({
        name: scan.student?.name || "Student",
        time: scan.createdAt,
        mealType,
      })),
    });
  } catch (err) {
    logInternalError("campus-dashboard-stats", err);
    sendServerError(
      res,
      "We could not load the dashboard right now. Please try again.",
    );
  }
};
