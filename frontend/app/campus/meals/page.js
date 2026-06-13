"use client";

import { React, useCallback, useEffect, useState, useMemo } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";
import { downloadCsv } from "@/app/utils/exportCsv";
import {
  getAppDayString,
  getAppMonth,
  getAppYear,
} from "@/app/utils/appTimezone";

const url = process.env.NEXT_PUBLIC_API_URL;

const getSemesterFromDate = (date) => {
  const month = getAppMonth(date);
  return month >= 9 || month <= 2 ? "first" : "second";
};

const getMealLabel = (mealType) => {
  switch (mealType) {
    case "breakfast":
      return "Breakfast";
    case "lunch":
      return "Lunch";
    case "dinner":
      return "Dinner";
    default:
      return mealType;
  }
};

const formatFastingTypeLabel = (type) => {
  if (!type) return "Unknown";
  if (type === "not_fasting") return "Not Fasting";
  if (type === "fasting") return "Orthodox Fasting";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const REPORT_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const REPORT_MEAL_SESSIONS = [
  { value: "total", label: "Total" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

const getSessionTimeLabel = (sessionValue, schedule) => {
  if (sessionValue === "total") {
    return "All Sessions";
  }

  return schedule?.[sessionValue]?.label || "--:-- - --:--";
};

const getSnapshotMealLabel = (mealType) => {
  switch (mealType) {
    case "breakfast":
      return "ቁርስ";
    case "lunch":
      return "ምሳ";
    case "dinner":
      return "እራት";
    default:
      return getMealLabel(mealType);
  }
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatDateTime = (value, fallback = "Not opened yet") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatWindowTime = (value, fallback = "Not available") =>
  value || fallback;

const safeFilePart = (value, fallback = "data") =>
  String(value || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

const getCafeNumberFromName = (name) => {
  const match = String(name || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getCafeLabel = (cafe, index) => {
  const value =
    Number(cafe?.cafeNumber) || getCafeNumberFromName(cafe?.name) || index + 1;
  let label = cafe?.displayName?.trim() || cafe?.name?.trim();
  if (!label) {
    label = String(value);
  }
  return {
    value: String(value),
    label,
  };
};

const getAppliedEndDate = (date, endTime) => {
  if (!date || typeof endTime !== "string") {
    return null;
  }

  const targetDate = date ? new Date(date) : null;
  const [hour, minute] = endTime.split(":").map(Number);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  targetDate.setHours(hour, minute, 0, 0);
  return targetDate;
};

const getValidClosingTime = (openedAt, closedAt, date, appliedEnd) => {
  if (!closedAt) return null;

  const closedDate = new Date(closedAt);
  const openedDate = openedAt ? new Date(openedAt) : null;
  const targetDate = date ? new Date(date) : null;
  const appliedEndDate = getAppliedEndDate(date, appliedEnd);

  if (Number.isNaN(closedDate.getTime())) {
    return null;
  }

  if (
    targetDate &&
    !Number.isNaN(targetDate.getTime()) &&
    closedDate.toDateString() !== targetDate.toDateString()
  ) {
    return null;
  }

  if (appliedEndDate && closedDate > appliedEndDate) {
    closedDate.setTime(appliedEndDate.getTime());
  }

  if (
    openedDate &&
    !Number.isNaN(openedDate.getTime()) &&
    closedDate < openedDate
  ) {
    return null;
  }

  return closedDate.toISOString();
};

const getStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "Active";
    case "logged_out":
      return "Logged Out";
    case "not_opened":
      return "Not Opened";
    case "completed":
      return "Completed";
    case "upcoming":
      return "Upcoming";
    default:
      return "Unknown";
  }
};

const getStatusClasses = (status) => {
  switch (status) {
    case "active":
      return "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "logged_out":
      return "border-rose-300/50 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400";
    case "not_opened":
      return "border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400";
    case "completed":
      return "border-blue-300/50 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    case "upcoming":
      return "border-amber-300/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    default:
      return "border-slate-200 bg-white text-slate-700 dark:bg-slate-900";
  }
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return "";

  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export default function CampusMealsPage() {
  const { currentCampus } = useCampus();
  const [selectedCafe, setSelectedCafe] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [mealSummary, setMealSummary] = useState(null);
  const [detailMode, setDetailMode] = useState("total");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [error, setError] = useState("");
  const [mealSchedule, setMealSchedule] = useState(null);
  const [cafes, setCafes] = useState([]);
  const [reportType, setReportType] = useState("daily");
  const [reportMealSession, setReportMealSession] = useState("total");
  const [reportCafe, setReportCafe] = useState("");
  const [reportDate, setReportDate] = useState(getAppDayString());
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const historyRange = "daily";

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setError("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [error]);

  const cafeOptions = useMemo(() => {
    const seen = new Set();
    return [
      { value: "", label: "All Cafes" },
      ...cafes
        .map((cafe, index) => getCafeLabel(cafe, index))
        .filter((item) => {
          if (seen.has(item.value)) return false;
          seen.add(item.value);
          return true;
        }),
    ];
  }, [cafes]);

  const selectedCafeOption = useMemo(
    () => cafeOptions.find((option) => option.value === selectedCafe),
    [cafeOptions, selectedCafe],
  );

  const reportCafeOption = useMemo(
    () => cafeOptions.find((option) => option.value === reportCafe),
    [cafeOptions, reportCafe],
  );

  const reportCafeLabel = useMemo(() => {
    const campusName = currentCampus?.name || reportData?.campusName || "";

    let baseCafeLabel = "";
    if (reportCafeOption?.label) {
      baseCafeLabel = reportCafeOption.label;
    } else if (reportData?.cafeNumber) {
      baseCafeLabel = reportData.cafeDisplayName || String(reportData.cafeNumber);
    }

    if (baseCafeLabel) {
      if (campusName && !baseCafeLabel.toLowerCase().includes(campusName.toLowerCase())) {
        return `${campusName} ${baseCafeLabel}`;
      }
      return baseCafeLabel;
    }

    return campusName ? `${campusName} All Cafes` : "All Cafes";
  }, [reportData, reportCafeOption, currentCampus]);

  const activeReportTypeLabel =
    reportType === "weekly"
      ? "Weekly"
      : reportType === "monthly"
        ? "Monthly"
        : "Daily";

  useEffect(() => {
    const today = getAppDayString();
    setReportDate(today);

    const start = new Date();
    start.setDate(start.getDate() - 6);
    setReportStartDate(start.toISOString().split("T")[0]);
    setReportEndDate(today);
    setReportMonth(String(new Date().getMonth() + 1));
    setReportYear(String(new Date().getFullYear()));
  }, []);

  const fetchReport = async () => {
    setReportError("");
    setReportData(null);
    setLoadingReport(true);

    try {
      const params = new URLSearchParams();
      if (reportCafe) params.append("cafeNumber", reportCafe);
      if (reportType === "daily") {
        params.append("date", reportDate);
      } else if (reportType === "weekly") {
        params.append("startDate", reportStartDate);
        params.append("endDate", reportEndDate);
      } else if (reportType === "monthly") {
        params.append("year", reportYear);
        params.append("month", reportMonth);
      }

      if (reportMealSession && reportMealSession !== "total") {
        params.append("mealType", reportMealSession);
      }

      const res = await fetch(
        `${url}/reports/${reportType}?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to generate report");
      }

      const data = await res.json();
      setReportData(data);
      // Update meal schedule to show actual applied times for the selected date
      if (data?.mealSchedule) {
        setMealSchedule(data.mealSchedule);
      }
    } catch (err) {
      setReportError(err?.message || "Unable to generate report.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportReportSummary = () => {
    if (!reportData) return;

    const cafeLabel = reportCafeLabel;
    const rows = [
      ["Cafe", cafeLabel],
      ["Period Type", activeReportTypeLabel],
      [
        "Meal Session",
        REPORT_MEAL_SESSIONS.find(
          (session) => session.value === reportMealSession,
        )?.label || "Total",
      ],
      ["Period Start", reportData.period?.startDate || ""],
      ["Period End", reportData.period?.endDate || ""],
      ["Total Regular", reportData.stats?.totalRegular ?? ""],
      ["Total Assigned", reportData.stats?.totalAssigned ?? ""],
      ["Total Unassigned", reportData.stats?.totalUnassigned ?? ""],
      ["Total Internship", reportData.stats?.totalInternships ?? ""],
      ["Total Served", reportData.stats?.totalServed ?? ""],
      ["Total Unserved", reportData.stats?.totalUnserved ?? ""],
    ];

    Object.entries(reportData.stats?.breakdown || {}).forEach(
      ([key, values]) => {
        rows.push([`${key} Total`, values.total ?? ""]);
        rows.push([`${key} Served`, values.served ?? ""]);
        rows.push([`${key} Unserved`, values.unserved ?? ""]);
      },
    );

    const safeCafe = safeFilePart(cafeLabel, "cafes");
    const safePeriod = safeFilePart(
      reportData.period?.startDate || reportData.period?.endDate || "period",
    );

    downloadCsv(
      `${safeCafe}-${safePeriod}-${activeReportTypeLabel.toLowerCase()}-report.csv`,
      rows,
    );
  };

  const reportSummaryNotice = useMemo(() => {
    if (!reportData) return null;

    switch (reportData.noDataReason) {
      case "future":
      case "upcoming":
        return (
          <div className="space-y-1 text-amber-900 dark:text-amber-200">
            <p className="font-bold">No data available for future dates.</p>
            <p>Attendance data has not been recorded yet.</p>
          </div>
        );
      case "before_system_start":
        return (
          <div className="space-y-1 text-amber-900 dark:text-amber-200">
            <p className="font-bold">No historical data exists for the selected date.</p>
            <p>The system was not in use during this period.</p>
          </div>
        );
      case "no_meal_record":
      case "no_data":
        return "No data is available for that date and session.";
      default:
        return null;
    }
  }, [reportData]);

  const hasSnapshotData = Boolean(mealSummary?.hasSnapshotData);
  const isBeforeSystemStart =
    mealSummary?.noDataReason === "before_system_start";
  const shouldHideCounts = !hasSnapshotData;
  const hasSessionWindowData = Boolean(
    mealSummary?.appliedMealWindow || mealSummary?.actualMealWindow?.openedAt,
  );
  const shouldShowSessionMeta =
    ["active", "logged_out", "not_opened", "completed"].includes(
      mealSummary?.sessionStatus || "",
    ) &&
    !isBeforeSystemStart &&
    (hasSnapshotData || hasSessionWindowData);
  const shouldShowOpenedTime = shouldShowSessionMeta;
  const shouldShowClosingTime = mealSummary?.sessionStatus === "completed";
  const validActualClosedAt = getValidClosingTime(
    mealSummary?.actualMealWindow?.openedAt,
    mealSummary?.actualMealWindow?.closedAt,
    mealSummary?.date,
    mealSummary?.appliedMealWindow?.end,
  );
  const shouldShowSnapshotSection =
    Boolean(mealSummary) &&
    (hasSnapshotData || mealSummary?.sessionStatus === "active") &&
    !isBeforeSystemStart;

  const getEmptyStateMessage = () => {
    if (mealSummary?.sessionStatus === "active") {
      return "";
    }

    if (mealSummary?.sessionStatus === "not_opened") {
      return "The cafe has not opened this meal session yet.";
    }

    if (mealSummary?.noDataReason === "snapshot_missing") {
      return "That session has a meal record, but no saved snapshot is available.";
    }

    if (mealSummary?.noDataReason === "no_meal_record") {
      return "No meal session was opened for that date and meal.";
    }

    if (
      mealSummary?.noDataReason === "upcoming" ||
      mealSummary?.noDataReason === "future"
    ) {
      return (
        <div className="space-y-1 text-amber-900 dark:text-amber-200">
          <p className="font-bold">No data available for future dates.</p>
          <p>Attendance data has not been recorded yet.</p>
        </div>
      );
    }

    if (mealSummary?.noDataReason === "before_system_start") {
      return (
        <div className="space-y-1 text-amber-900 dark:text-amber-200">
          <p className="font-bold">No historical data exists for the selected date.</p>
          <p>The system was not in use during this period.</p>
        </div>
      );
    }

    return "No data is available for that date and session.";
  };

  useEffect(() => {
    setSelectedDate(getAppDayString());
  }, []);

  useEffect(() => {
    const fetchCafes = async () => {
      try {
        const res = await fetch("/api/campus/cafes", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.cafes)) {
          setCafes(data.cafes);
        }
      } catch (err) {
        console.error("Failed to load cafes for campus meals dropdown:", err);
      }
    };

    if (currentCampus) {
      fetchCafes();
    }
  }, [currentCampus]);

  // Fetch meal schedule on page load to show real times
  useEffect(() => {
    const fetchInitialSchedule = async () => {
      try {
        if (!url) {
          console.error(
            "API_URL is not defined. Check NEXT_PUBLIC_API_URL env variable.",
          );
          return;
        }

        // Fetch a daily report to get the meal schedule
        const today = getAppDayString();
        console.log("Fetching meal schedule for date:", today);
        const params = new URLSearchParams();
        params.append("date", today);
        const url_with_params = `${url}/reports/daily?${params.toString()}`;
        console.log("Fetching from:", url_with_params);

        const res = await fetch(url_with_params, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });
        console.log("Response status:", res.status);

        if (!res.ok) {
          console.error("Response not ok:", res.statusText);
          return;
        }

        const data = await res.json();
        console.log("Response data:", data);

        if (data?.mealSchedule) {
          console.log("Fetched meal schedule successfully:", data.mealSchedule);
          setMealSchedule(data.mealSchedule);
        } else {
          console.log("No mealSchedule in response. Full response:", data);
        }
      } catch (err) {
        console.error("Error fetching initial schedule:", err);
      }
    };
    fetchInitialSchedule();
  }, []);

  // Log mealSchedule changes
  useEffect(() => {
    if (mealSchedule) {
      console.log("mealSchedule updated in component state:", mealSchedule);
    }
  }, [mealSchedule]);

  useEffect(() => {
    const fetchScheduleForDate = async () => {
      if (!currentCampus || !selectedDate) return;
      try {
        const campusId = currentCampus.campusId || currentCampus.id;
        const res = await fetch(`${url}/reports/daily?campusId=${campusId}&date=${selectedDate}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.mealSchedule) {
            setMealSchedule(data.mealSchedule);
          }
        }
      } catch (err) {
        console.error("Failed to fetch schedule for selectedDate:", err);
      }
    };
    fetchScheduleForDate();
  }, [currentCampus, selectedDate]);

  useEffect(() => {
    setDetailMode("total");
  }, [mealSummary]);

  const getBreakdownTitle = () => {
    switch (detailMode) {
      case "total":
        return `Total Students by Fasting Type (${snapshotMealLabel})`;
      case "regular":
        return `Regular Students by Fasting Type (${snapshotMealLabel})`;
      case "internship":
        return `Internship Students by Fasting Type (${snapshotMealLabel})`;
      case "served":
        return `Served Students by Fasting Type (${snapshotMealLabel})`;
      case "notServed":
        return `Pending Students by Fasting Type (${snapshotMealLabel})`;
      default:
        return `Students by Fasting Type (${snapshotMealLabel})`;
    }
  };

  const getActiveBreakdown = () => {
    switch (detailMode) {
      case "regular":
        return mealSummary?.regularFastingBreakdown;
      case "internship":
        return mealSummary?.internshipFastingBreakdown;
      case "served":
        return mealSummary?.servedFastingBreakdown;
      case "notServed":
        return mealSummary?.notServedFastingBreakdown;
      case "total":
      default:
        return mealSummary?.fastingBreakdown;
    }
  };

  const activeBreakdown = getActiveBreakdown();
  const snapshotMealLabel = getSnapshotMealLabel(mealSummary?.mealType);
  const snapshotCounts = {
    total: mealSummary?.totalStudents ?? 0,
    regular: mealSummary?.regularStudents ?? 0,
    internship: mealSummary?.internshipStudents ?? 0,
    served: mealSummary?.servedStudents ?? 0,
    pending: mealSummary?.notServedStudents ?? 0,
  };

  const handleExportSummary = () => {
    if (!mealSummary) return;

    const rows = [
      ["Campus", mealSummary.campusName || ""],
      [
        "Cafe",
        selectedCafeOption?.label ||
          mealSummary.cafeDisplayName ||
          (mealSummary.cafeNumber ? String(mealSummary.cafeNumber) : ""),
      ],
      ["Cafe Number", mealSummary.cafeNumber || ""],
      [
        "Date",
        mealSummary.date
          ? new Date(mealSummary.date).toISOString().split("T")[0]
          : "",
      ],
      ["Meal Type", getMealLabel(mealSummary.mealType)],
      ["Status", getStatusLabel(mealSummary.sessionStatus)],
      ["Applied Time", mealSummary.appliedMealWindow?.label || ""],
      ["Opened Time", mealSummary.actualMealWindow?.openedAt || ""],
      ["Closed Time", validActualClosedAt || ""],
      ["Total Students", mealSummary.totalStudents ?? ""],
      ["Regular Students", mealSummary.regularStudents ?? ""],
      ["Internship Students", mealSummary.internshipStudents ?? ""],
      ["Served Students", mealSummary.servedStudents ?? ""],
      ["Pending Students", mealSummary.notServedStudents ?? ""],
      ["Total Orthodox Fasting", mealSummary.fastingBreakdown?.fasting ?? ""],
      [
        "Total Sunday Fasting",
        mealSummary.fastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Total Muslim Fasting",
        mealSummary.fastingBreakdown?.muslimFasting ?? "",
      ],
      ["Total Not Fasting", mealSummary.fastingBreakdown?.notFasting ?? ""],
      ["Regular Orthodox Fasting", mealSummary.regularFastingBreakdown?.fasting ?? ""],
      [
        "Regular Sunday Fasting",
        mealSummary.regularFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Regular Muslim Fasting",
        mealSummary.regularFastingBreakdown?.muslimFasting ?? "",
      ],
      [
        "Regular Not Fasting",
        mealSummary.regularFastingBreakdown?.notFasting ?? "",
      ],
      [
        "Internship Orthodox Fasting",
        mealSummary.internshipFastingBreakdown?.fasting ?? "",
      ],
      [
        "Internship Sunday Fasting",
        mealSummary.internshipFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Internship Muslim Fasting",
        mealSummary.internshipFastingBreakdown?.muslimFasting ?? "",
      ],
      [
        "Internship Not Fasting",
        mealSummary.internshipFastingBreakdown?.notFasting ?? "",
      ],
      ["Served Orthodox Fasting", mealSummary.servedFastingBreakdown?.fasting ?? ""],
      [
        "Served Sunday Fasting",
        mealSummary.servedFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Served Muslim Fasting",
        mealSummary.servedFastingBreakdown?.muslimFasting ?? "",
      ],
      [
        "Served Not Fasting",
        mealSummary.servedFastingBreakdown?.notFasting ?? "",
      ],
      ["Pending Orthodox Fasting", mealSummary.notServedFastingBreakdown?.fasting ?? ""],
      [
        "Pending Sunday Fasting",
        mealSummary.notServedFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Pending Muslim Fasting",
        mealSummary.notServedFastingBreakdown?.muslimFasting ?? "",
      ],
      [
        "Pending Not Fasting",
        mealSummary.notServedFastingBreakdown?.notFasting ?? "",
      ],
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cafeLabel =
      selectedCafeOption?.label ||
      mealSummary.cafeDisplayName ||
      String(mealSummary.cafeNumber || "all");
    const safeCampusName = safeFilePart(mealSummary.campusName || "campus");
    const safeCafeName = safeFilePart(cafeLabel, "all");
    const safeMealType = safeFilePart(mealSummary.mealType || "meal");
    const safeDate = mealSummary.date
      ? new Date(mealSummary.date).toISOString().split("T")[0]
      : "date";

    link.href = objectUrl;
    link.download = `${safeCampusName}-${safeCafeName}-${safeDate}-${safeMealType}-summary.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleExportMealStudents = async () => {
    if (!mealSummary) return;

    setExportingStudents(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        mealType: selectedMealType,
      });
      if (selectedCafe) params.append("cafeNumber", selectedCafe);

      const res = await fetch(
        `${url}/campus/meals/students?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.message || "We could not load meal student data right now.",
        );
      }

      const rows = [
        [
          "Name",
          "Student ID",
          "Department",
          "Batch",
          "Fasting Type",
          "Internship",
          "Status",
          "Scanned At",
        ],
        ...(data.students || []).map((student) => [
          student.name || "",
          student.studentId || "",
          student.department || "",
          student.batch ?? "",
          student.fastingType || "",
          student.isInternship ? "Yes" : "No",
          student.status || "",
          student.scannedAt || "",
        ]),
      ];

      const cafeLabel =
        selectedCafeOption?.label ||
        mealSummary.cafeDisplayName ||
        String(mealSummary.cafeNumber || "all");
      const safeCampusName = safeFilePart(mealSummary.campusName || "campus");
      const safeCafeName = safeFilePart(cafeLabel, "all");
      const safeMealType = safeFilePart(mealSummary.mealType || "meal");
      const safeDate = mealSummary.date
        ? new Date(mealSummary.date).toISOString().split("T")[0]
        : "date";

      downloadCsv(
        `${safeCampusName}-${safeCafeName}-${safeDate}-${safeMealType}-students.csv`,
        rows,
      );
    } catch (err) {
      setError(err.message || "We could not export meal students right now.");
    } finally {
      setExportingStudents(false);
    }
  };

  const fetchMealSummary = useCallback(async () => {
    if (!currentCampus || !selectedDate || !selectedMealType) {
      setError("Please choose a date and meal session first.");
      return;
    }

    const queryDate = new Date(`${selectedDate}T12:00:00+03:00`);
    const year = getAppYear(queryDate);
    const semester = getSemesterFromDate(queryDate);

    setLoadingSummary(true);
    setMealSummary(null);
    setError("");

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        mealType: selectedMealType,
        year: String(year),
        semester,
        historyRange,
      });
      if (selectedCafe) params.append("cafeNumber", selectedCafe);

      const res = await fetch(`${url}/campus/meals?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message ||
            "We could not load that meal summary right now. Please try again.",
        );
      }

      const data = await res.json();
      setMealSummary(data.summary || null);
      if (data.summary?.mealSchedule) {
        setMealSchedule(data.summary.mealSchedule);
      }
    } catch (err) {
      setError(
        err.message ||
          "We could not load that meal summary right now. Please try again.",
      );
    } finally {
      setLoadingSummary(false);
    }
  }, [
    currentCampus,
    selectedDate,
    selectedMealType,
    historyRange,
    selectedCafe,
  ]);

  const handleShowHistory = async () => {
    await fetchMealSummary();
  };

  if (!currentCampus) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-slate-200"></div>
          <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell relative min-h-screen overflow-hidden px-6 pb-12 pt-28 md:px-20 md:pt-36">
        <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-16 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="mx-auto max-w-6xl">
          <div className="surface-panel mb-4 rounded-[20px] py-4 px-6 shadow-sm border border-slate-200 bg-white/80">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-400/80">
                  Campus Meals
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-blue-700">
                  Meal Session History
                </h1>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Review campus meal sessions by cafe, date, and meal type — then generate attendance reports for the selected cafeteria.
              </p>
            </div>
          </div>
          <div className="hidden">
            <div className="surface-card rounded-[28px] p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Filters
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select the cafe, date, and meal session you want to review.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cafe
                  </span>
                  <select
                    value={selectedCafe}
                    onChange={(e) => setSelectedCafe(e.target.value)}
                    className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                  >
                    {cafeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Date
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Session
                  </span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {["breakfast", "lunch", "dinner"].map((mealType) => {
                      const active = selectedMealType === mealType;

                      return (
                        <button
                          key={mealType}
                          type="button"
                          onClick={() => setSelectedMealType(mealType)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            active
                              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="text-sm font-semibold">
                            {getMealLabel(mealType)}
                          </div>
                          <div className="mt-1 text-xs opacity-80">
                            {mealSchedule?.[mealType]?.label || "--:-- - --:--"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </label>
              </div>

              <button
                onClick={handleShowHistory}
                disabled={loadingSummary}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
              >
                {loadingSummary ? "Loading Summary..." : "Show Meal Summary"}
              </button>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fadeIn">
                  {error}
                </div>
              )}
            </div>

            <div className="surface-panel flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                Snapshot
              </p>

              {mealSummary ? (
                <>
                  <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl text-slate-900 dark:text-white">
                    Snapshot for{" "}
                    {selectedCafeOption?.label ||
                      mealSummary.cafeDisplayName ||
                      mealSummary.campusName}
                  </h2>
                  <h3 className="mt-3 text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Student Snapshot{" "}
                    {selectedCafeOption?.label ||
                      mealSummary.cafeDisplayName ||
                      mealSummary.campusName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    A quick view of regular, internship, served, and pending
                    students for {getSnapshotMealLabel(mealSummary.mealType)}.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(mealSummary.date)} •{" "}
                      {getMealLabel(mealSummary.mealType)}
                    </p>
                    {!isBeforeSystemStart && (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${getStatusClasses(
                          mealSummary.sessionStatus,
                        )}`}
                      >
                        {getStatusLabel(mealSummary.sessionStatus)}
                      </span>
                    )}
                    {mealSummary.sessionStatus === "active" && (
                      <button
                        type="button"
                        onClick={fetchMealSummary}
                        disabled={loadingSummary}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingSummary ? "Refreshing..." : "Refresh Live Data"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleExportMealStudents}
                      disabled={exportingStudents}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {exportingStudents ? "Exporting..." : "Export Students"}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSummary}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Export Summary
                    </button>
                  </div>

                  {shouldShowSessionMeta && (
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200/50 dark:border-slate-800 pt-5 text-sm">
                      {shouldShowOpenedTime && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                            Session Start
                          </p>
                          <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                            {formatDateTime(
                              mealSummary.actualMealWindow?.openedAt,
                            )}
                          </p>
                        </div>
                      )}
                      {shouldShowClosingTime && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                            Session End
                          </p>
                          <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                            {formatDateTime(
                              validActualClosedAt,
                              mealSummary?.sessionStatus === "completed"
                                ? "Completed"
                                : "Not opened yet",
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                          Scheduled Window
                        </p>
                        <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                          {formatWindowTime(
                            mealSummary.appliedMealWindow?.label,
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldShowSnapshotSection && (
                    <div className="mt-6 space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            !shouldHideCounts && setDetailMode("total")
                          }
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "total"
                              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300/50 dark:border-blue-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Total Students
                          </p>
                          <p className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-400">
                            {shouldHideCounts ? "-" : snapshotCounts.total}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-500">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            !shouldHideCounts && setDetailMode("regular")
                          }
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "regular"
                              ? "bg-sky-50 dark:bg-sky-950/20 border-sky-300/50 dark:border-sky-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            Regular Students
                          </p>
                          <p className="mt-2 text-3xl font-black text-sky-700 dark:text-sky-400">
                            {shouldHideCounts ? "-" : snapshotCounts.regular}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-500">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            !shouldHideCounts && setDetailMode("internship")
                          }
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "internship"
                              ? "bg-fuchsia-50 dark:bg-fuchsia-950/20 border-fuchsia-300/50 dark:border-fuchsia-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Internship Students
                          </p>
                          <p className="mt-2 text-3xl font-black text-fuchsia-700 dark:text-fuchsia-400">
                            {shouldHideCounts ? "-" : snapshotCounts.internship}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            !shouldHideCounts && setDetailMode("served")
                          }
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "served"
                              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300/50 dark:border-emerald-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Served Today
                          </p>
                          <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">
                            {shouldHideCounts ? "-" : snapshotCounts.served}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            !shouldHideCounts && setDetailMode("notServed")
                          }
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition md:col-span-2 ${
                            detailMode === "notServed"
                              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300/50 dark:border-amber-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Pending
                          </p>
                          <p className="mt-2 text-3xl font-black text-amber-700 dark:text-amber-400">
                            {shouldHideCounts ? "-" : snapshotCounts.pending}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-600">
                            Fasting breakdown
                          </p>
                        </button>
                      </div>

                      {activeBreakdown && (
                        <div className="surface-card rounded-[24px] border border-slate-200 dark:border-slate-800 p-6">
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {getBreakdownTitle()}
                          </h3>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/10 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">
                                Orthodox Fasting
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.fasting ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/10 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">
                                Sunday Fasting
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.sundayFasting ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">
                                Muslim Fasting
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.muslimFasting ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">
                                Not Fasting
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.notFasting ?? 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!shouldShowSnapshotSection && (
                    <div className="mt-8 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 text-center text-slate-500 dark:text-slate-400">
                      {getEmptyStateMessage()}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-8 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 text-center text-slate-500 dark:text-slate-400">
                  Select a cafeteria, date, and meal session to view the
                  historical snapshot record.
                </div>
              )}
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="surface-card rounded-[28px] p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Report Filters
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select the period type, cafeteria, and time range to calculate
                attendance.
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Report Type
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {REPORT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setReportType(type.value);
                          setReportData(null);
                        }}
                        className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold capitalize transition ${
                          reportType === type.value
                            ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Meal Session
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {REPORT_MEAL_SESSIONS.map((session) => (
                      <button
                        key={session.value}
                        type="button"
                        onClick={() => {
                          setReportMealSession(session.value);
                          setReportData(null);
                        }}
                        className={`min-w-[130px] rounded-2xl border px-3 py-3 text-left transition ${
                          reportMealSession === session.value
                            ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-sm font-semibold capitalize">
                          {session.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {getSessionTimeLabel(session.value, mealSchedule)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cafeteria
                </span>
                <select
                  value={reportCafe}
                  onChange={(e) => {
                    setReportCafe(e.target.value);
                    setReportData(null);
                  }}
                  className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                >
                  {cafeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {reportType === "daily" && (
                <label className="block animate-fadeIn">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Date
                  </span>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => {
                      setReportDate(e.target.value);
                      setReportData(null);
                    }}
                    className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </label>
              )}

              {reportType === "weekly" && (
                <div className="grid gap-3 sm:grid-cols-2 animate-fadeIn">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Start Date
                    </span>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => {
                        setReportStartDate(e.target.value);
                        setReportData(null);
                      }}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      End Date
                    </span>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => {
                        setReportEndDate(e.target.value);
                        setReportData(null);
                      }}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                  </label>
                </div>
              )}

              {reportType === "monthly" && (
                <div className="grid gap-3 sm:grid-cols-2 animate-fadeIn">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Month
                    </span>
                    <select
                      value={reportMonth}
                      onChange={(e) => {
                        setReportMonth(e.target.value);
                        setReportData(null);
                      }}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                    >
                      {Array.from({ length: 12 }, (_, index) => ({
                        value: String(index + 1),
                        label: new Date(0, index).toLocaleString("en-US", {
                          month: "long",
                        }),
                      })).map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Year
                    </span>
                    <select
                      value={reportYear}
                      onChange={(e) => {
                        setReportYear(e.target.value);
                        setReportData(null);
                      }}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                    >
                      {Array.from({ length: 6 }, (_, index) => {
                        const year = new Date().getFullYear() + index;
                        return (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              )}

              <button
                onClick={fetchReport}
                disabled={loadingReport}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
              >
                {loadingReport ? "Generating Report..." : "Generate Report"}
              </button>

              {reportError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fadeIn">
                  {reportError}
                </div>
              )}
            </div>

            <div className="surface-panel flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                Report Summary
              </p>
              {reportData && !reportSummaryNotice && (
                <button
                  type="button"
                  onClick={handleExportReportSummary}
                  className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Export Summary
                </button>
              )}

              {reportData ? (
                <div className="mt-2 flex flex-col h-full">
                  {reportSummaryNotice ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {reportSummaryNotice}
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black leading-tight text-(--app-text) md:text-3xl">
                        {reportCafeLabel}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {reportType === "daily"
                          ? `Daily report for ${reportData.period.startDate}`
                          : reportType === "weekly"
                            ? `Weekly report from ${reportData.period.startDate} to ${reportData.period.endDate}`
                            : `Monthly report for ${reportData.period.startDate.split("-").slice(0, 2).join("-")}`}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">
                        {REPORT_MEAL_SESSIONS.find(
                          (item) => item.value === reportMealSession,
                        )?.label || "All Sessions"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {getSessionTimeLabel(reportMealSession, mealSchedule) ||
                          "All Sessions"}
                      </p>

                      <div className={`grid gap-3 mt-5 ${reportCafe ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
                        <div className="rounded-3xl bg-white border border-blue-100 p-4 text-left">
                          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                            Total Students
                          </p>
                          <p className="mt-1 text-2xl font-black text-blue-900">
                            {reportData.stats.totalRegular.toLocaleString()}
                          </p>
                        </div>

                        {reportCafe ? (
                          <>
                            <div className="rounded-3xl bg-white border border-emerald-100 p-4 text-left">
                              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                                Served
                              </p>
                              <p className="mt-1 text-2xl font-black text-emerald-900">
                                {reportData.stats.totalServed.toLocaleString()}
                              </p>
                            </div>

                            <div className="rounded-3xl bg-white border border-amber-100 p-4 text-left">
                              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                                Unserved
                              </p>
                              <p className="mt-1 text-2xl font-black text-amber-900">
                                {reportData.stats.totalUnserved.toLocaleString()}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="rounded-3xl bg-white border border-emerald-100 p-4 text-left">
                              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                                Regular
                              </p>
                              <p className="mt-1 text-2xl font-black text-emerald-900">
                                {reportData.stats.totalAssigned.toLocaleString()}
                              </p>
                            </div>

                            <div className="rounded-3xl bg-white border border-amber-100 p-4 text-left">
                              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                                Unassigned
                              </p>
                              <p className="mt-1 text-2xl font-black text-amber-900">
                                {reportData.stats.totalUnassigned.toLocaleString()}
                              </p>
                            </div>

                            <div className="rounded-3xl bg-white border border-slate-200/60 p-4 text-left">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Internship
                              </p>
                              <p className="mt-1 text-2xl font-black text-slate-800">
                                {(reportData.stats.totalInternships ?? 0).toLocaleString()}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-6 rounded-3xl bg-white p-4 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800">
                          Served Progress Ratio
                        </h3>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                            <span>
                              Served (
                              {(
                                (reportData.stats.totalServed /
                                  (reportData.stats.totalAssigned || 1)) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                            <span>
                              Unserved (
                              {(
                                (reportData.stats.totalUnserved /
                                  (reportData.stats.totalAssigned || 1)) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          </div>
                          <div className="w-full h-4 rounded-full bg-white overflow-hidden flex">
                            <div
                              style={{
                                width: `${(reportData.stats.totalServed / (reportData.stats.totalAssigned || 1)) * 100}%`,
                              }}
                              className="h-full bg-linear-to-r from-emerald-500 to-teal-500"
                            />
                            <div
                              style={{
                                width: `${(reportData.stats.totalUnserved / (reportData.stats.totalAssigned || 1)) * 100}%`,
                              }}
                              className="h-full bg-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex-1">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 mb-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Total Report Summary
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Regular students, served students, and unserved
                                students totals.
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  Total Students
                                </p>
                                <p className="mt-2 text-2xl font-black text-blue-900">
                                  {(reportData.stats.totalServed + reportData.stats.totalUnserved).toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  Total Served
                                </p>
                                <p className="mt-2 text-2xl font-black text-emerald-900">
                                  {reportData.stats.totalServed.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  Total Unserved
                                </p>
                                <p className="mt-2 text-2xl font-black text-amber-900">
                                  {reportData.stats.totalUnserved.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-(--app-text) mb-3">
                          Attendance Breakdown by Fasting Type
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <th className="px-4 py-3">Fasting Type</th>
                                <th className="px-4 py-3 text-right">
                                  Regular Students
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Served Students
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Unserved Students
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                              {Object.entries(reportData.stats.breakdown).map(
                                ([key, rowData]) => (
                                  <tr key={key} className="hover:bg-white">
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                      {formatFastingTypeLabel(key)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 font-medium">
                                      {rowData.total.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                                      {rowData.served.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-semibold">
                                      {rowData.unserved.toLocaleString()}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-6 rounded-3xl bg-white p-4 border border-slate-200">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                          Attendance by Fasting Type
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(reportData.stats.breakdown).map(
                            ([key, categoryData], index) => {
                              const servedPct =
                                categoryData.total > 0
                                  ? (categoryData.served / categoryData.total) *
                                    100
                                  : 0;
                              const colors = [
                                "from-blue-500 to-cyan-500",
                                "from-violet-500 to-fuchsia-500",
                                "from-emerald-500 to-teal-500",
                                "from-amber-500 to-orange-500",
                                "from-rose-500 to-pink-500",
                              ];
                              const color = colors[index % colors.length];

                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {formatFastingTypeLabel(key)}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {categoryData.served} of{" "}
                                      {categoryData.total} served (
                                      {servedPct.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      style={{ width: `${servedPct}%` }}
                                      className={`h-full bg-linear-to-r ${color}`}
                                    />
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  <p className="font-semibold text-slate-800">
                    No report generated yet
                  </p>
                  <p className="mt-2">
                    Pick your parameters on the left and click &quot;Generate
                    Report&quot;.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
