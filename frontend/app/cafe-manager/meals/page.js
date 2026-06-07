"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "../../context/UserContext";
import { getAppDayString } from "@/app/utils/appTimezone";
import { downloadCsv } from "@/app/utils/exportCsv";

const url = process.env.NEXT_PUBLIC_API_URL;

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

const formatWindowTime = (value, fallback = "Not available") =>
  value || fallback;

const hasUsableWindow = (window) =>
  Boolean(window && (window.label || (window.start && window.end)));

const formatAppliedWindow = (window, fallback = "--:-- - --:--") => {
  if (!hasUsableWindow(window)) return fallback;
  if (window.label) return window.label;
  if (window.start && window.end) return `${window.start} - ${window.end}`;
  return fallback;
};

const formatFastingTypeLabel = (type) => {
  if (!type) return "Unknown";
  if (type === "not_fasting") return "Normal";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const HISTORY_RANGE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SESSION_MEAL_TYPES = ["breakfast", "lunch", "dinner"];

const REPORT_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const REPORT_MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const REPORT_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030"];

const toSafeFilePart = (value, fallback = "data") =>
  String(value || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || fallback;

const getCafeNumberFromName = (name) => {
  const match = String(name || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

export default function CafeMealsPage() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState("sessionHistory"); // 'sessionHistory' or 'attendanceReports'
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCafe, setSelectedCafe] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [mealSummary, setMealSummary] = useState(null);
  const [detailMode, setDetailMode] = useState("total");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");
  const [mealSchedule, setMealSchedule] = useState(null);
  const [historyRange, setHistoryRange] = useState("daily");
  const [cafes, setCafes] = useState([]);

  // Attendance Reports States
  const [reportType, setReportType] = useState("daily"); // 'daily', 'weekly', 'monthly'
  const [reportCafe, setReportCafe] = useState(""); // '' for All, or specific cafeNumber
  const [reportDate, setReportDate] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  const cafeOptions = useMemo(() => {
    const seen = new Set();

    return cafes
      .map((cafe, index) => {
        const value =
          Number(cafe?.cafeNumber) ||
          getCafeNumberFromName(cafe?.name) ||
          index + 1;

        let label = cafe?.displayName?.trim();
        if (!label && cafe?.name) {
          const extractedNumber = getCafeNumberFromName(cafe.name);
          label = extractedNumber
            ? `Cafe ${extractedNumber}`
            : cafe.name.trim();
        }
        if (!label) {
          label = `Cafe ${value}`;
        }

        return {
          value: String(value),
          label,
        };
      })
      .filter((cafe) => {
        if (seen.has(cafe.value)) return false;
        seen.add(cafe.value);
        return true;
      });
  }, [cafes]);

  useEffect(() => {
    const fetchCafes = async () => {
      try {
        const res = await fetch(`${url}/campus/cafes`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCafes(Array.isArray(data.cafes) ? data.cafes : []);
        }
      } catch {
        setCafes([]);
      }
    };
    fetchCafes();
  }, []);

  useEffect(() => {
    if (selectedCafe || cafeOptions.length === 0) return;

    const defaultCafe =
      currentUser?.activeCafeNumber ||
      currentUser?.selectedCafeNumber ||
      cafeOptions[0]?.value ||
      "";

    if (defaultCafe) {
      setSelectedCafe(String(defaultCafe));
    }
  }, [
    cafeOptions,
    currentUser?.activeCafeNumber,
    currentUser?.selectedCafeNumber,
    selectedCafe,
  ]);

  useEffect(() => {
    const today = getAppDayString();
    setSelectedDate(today);
    setReportDate(today);

    // Default weekly range to last 7 days
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startStr = start.toISOString().split("T")[0];
    setReportStartDate(startStr);
    setReportEndDate(today);

    // Default monthly to current month and year
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    setReportMonth(String(currentMonth));
    setReportYear(String(currentYear));
  }, []);

  useEffect(() => {
    const fetchMealSchedule = async () => {
      if (!currentUser?.campusId || !selectedDate) {
        setMealSchedule(null);
        return;
      }

      try {
        const params = new URLSearchParams({ date: selectedDate });
        const res = await fetch(`${url}/campus/schedule?${params.toString()}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load meal schedule");
        }
        setMealSchedule(data.schedule || null);
      } catch {
        setMealSchedule(null);
      }
    };
    if (selectedDate) fetchMealSchedule();
  }, [currentUser?.campusId, selectedDate]);

  const fetchMealSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError("");
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        mealType: selectedMealType,
        historyRange,
      });
      if (selectedCafe) params.append("cafeNumber", selectedCafe);
      const res = await fetch(`${url}/campus/meals?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load meal summary");
      const data = await res.json();
      setMealSummary(data.summary || null);
    } catch (err) {
      setError(err.message || "Could not load meal summary");
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedDate, selectedMealType, historyRange, selectedCafe]);

  const fetchReport = useCallback(async () => {
    setLoadingReport(true);
    setReportError("");
    setReportData(null);
    try {
      let endpoint = "";
      const params = new URLSearchParams();
      if (reportCafe) params.append("cafeNumber", reportCafe);

      if (reportType === "daily") {
        endpoint = `${url}/reports/daily`;
        params.append("date", reportDate);
      } else if (reportType === "weekly") {
        endpoint = `${url}/reports/weekly`;
        params.append("startDate", reportStartDate);
        params.append("endDate", reportEndDate);
      } else if (reportType === "monthly") {
        endpoint = `${url}/reports/monthly`;
        params.append("year", reportYear);
        params.append("month", reportMonth);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to load report data");
      setReportData(data || null);
    } catch (err) {
      setReportError(err.message || "Could not load report data");
    } finally {
      setLoadingReport(false);
    }
  }, [
    reportType,
    reportCafe,
    reportDate,
    reportStartDate,
    reportEndDate,
    reportYear,
    reportMonth,
  ]);

  useEffect(() => {
    setDetailMode("total");
  }, [mealSummary]);

  const getBreakdownTitle = () => {
    switch (detailMode) {
      case "total":
        return `Total Students by Fasting Type (${getSnapshotMealLabel(mealSummary?.mealType)})`;
      case "regular":
        return `Regular Students by Fasting Type (${getSnapshotMealLabel(mealSummary?.mealType)})`;
      case "internship":
        return `Internship Students by Fasting Type (${getSnapshotMealLabel(mealSummary?.mealType)})`;
      case "served":
        return `Served Students by Fasting Type (${getSnapshotMealLabel(mealSummary?.mealType)})`;
      case "notServed":
        return `Pending Students by Fasting Type (${getSnapshotMealLabel(mealSummary?.mealType)})`;
      default:
        return `Students by Fasting Type (${getSnapshotMealLabel(mealSummary?.mealType)})`;
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

  const selectedCafeOption = useMemo(
    () => cafeOptions.find((cafe) => cafe.value === selectedCafe),
    [cafeOptions, selectedCafe],
  );

  const reportCafeOption = useMemo(
    () => cafeOptions.find((cafe) => cafe.value === reportCafe),
    [cafeOptions, reportCafe],
  );

  const activeBreakdown = getActiveBreakdown();
  const snapshotMealLabel = getSnapshotMealLabel(mealSummary?.mealType);
  const snapshotCounts = {
    total: mealSummary?.totalStudents ?? 0,
    regular: mealSummary?.regularStudents ?? 0,
    internship: mealSummary?.internshipStudents ?? 0,
    served: mealSummary?.servedStudents ?? 0,
    pending: mealSummary?.notServedStudents ?? 0,
  };

  const formatSnapshotTitle = (ms) => {
    if (!ms) return "";
    if (selectedCafeOption?.label) return selectedCafeOption.label;

    let name = ms.cafeDisplayName ? String(ms.cafeDisplayName).trim() : "";
    name = name.replace(/system\s*admin(istrator)?\s*[:\-–—]?\s*/i, "").trim();
    const cafeMatch = name.match(/(Cafe\s*\d+)/i);
    if (cafeMatch) return cafeMatch[1];
    if (name) return name;
    if (ms.cafeNumber) return `Cafe ${ms.cafeNumber}`;
    return "All Cafes";
  };

  const getAppliedWindowForSummary = (summary) => {
    const selectedScheduleWindow = mealSchedule?.[selectedMealType];
    if (hasUsableWindow(selectedScheduleWindow)) {
      return selectedScheduleWindow;
    }

    const directWindow = summary?.appliedMealWindow;
    if (hasUsableWindow(directWindow)) {
      return directWindow;
    }

    const scheduleWindow = summary?.mealSchedule?.[summary?.mealType];
    if (hasUsableWindow(scheduleWindow)) {
      return scheduleWindow;
    }

    return null;
  };

  const handleExportMealSummary = () => {
    if (!mealSummary) return;

    const appliedWindow = getAppliedWindowForSummary(mealSummary);
    const rows = [
      ["Campus", mealSummary.campusName || ""],
      [
        "Cafe",
        selectedCafeOption?.label ||
          mealSummary.cafeDisplayName ||
          `Cafe ${mealSummary.cafeNumber || ""}`,
      ],
      ["Cafe Number", mealSummary.cafeNumber || ""],
      [
        "Date",
        mealSummary.date
          ? new Date(mealSummary.date).toISOString().split("T")[0]
          : "",
      ],
      ["Meal Type", getMealLabel(mealSummary.mealType)],
      ["Applied Time", formatAppliedWindow(appliedWindow)],
      ["Opened Time", mealSummary.actualMealWindow?.openedAt || ""],
      ["Closed Time", mealSummary.actualMealWindow?.closedAt || ""],
      ["Total Students", mealSummary.totalStudents ?? ""],
      ["Regular Students", mealSummary.regularStudents ?? ""],
      ["Internship Students", mealSummary.internshipStudents ?? ""],
      ["Served Students", mealSummary.servedStudents ?? ""],
      ["Pending Students", mealSummary.notServedStudents ?? ""],
      ["Fasting", mealSummary.fastingBreakdown?.fasting ?? ""],
      ["Sunday Fasting", mealSummary.fastingBreakdown?.sundayFasting ?? ""],
      ["Muslim Fasting", mealSummary.fastingBreakdown?.muslimFasting ?? ""],
      ["Not Fasting", mealSummary.fastingBreakdown?.notFasting ?? ""],
      ["Regular Fasting", mealSummary.regularFastingBreakdown?.fasting ?? ""],
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
        "Internship Fasting",
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
      ["Served Fasting", mealSummary.servedFastingBreakdown?.fasting ?? ""],
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
      ["Pending Fasting", mealSummary.notServedFastingBreakdown?.fasting ?? ""],
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

    const safeCafe = toSafeFilePart(
      selectedCafeOption?.label || mealSummary.cafeDisplayName || "cafe",
    );
    const safeMeal = toSafeFilePart(mealSummary.mealType || "meal");
    const safeDate = mealSummary.date
      ? new Date(mealSummary.date).toISOString().split("T")[0]
      : "date";

    downloadCsv(`${safeCafe}-${safeDate}-${safeMeal}-summary.csv`, rows);
  };

  const handleExportReportSummary = () => {
    if (!reportData) return;

    const rows = [
      [
        "Cafe",
        reportCafeOption?.label ||
          reportData.cafeDisplayName ||
          `Cafe ${reportData.cafeNumber || "All"}`,
      ],
      ["Cafe Number", reportData.cafeNumber || "All"],
      ["Period Type", activeReportTypeLabel],
      ["Period Start", reportData.period?.startDate || ""],
      ["Period End", reportData.period?.endDate || ""],
      ["Total Regular", reportData.stats?.totalRegular ?? ""],
      ["Total Served", reportData.stats?.totalServed ?? ""],
      ["Total Unserved", reportData.stats?.totalUnserved ?? ""],
    ];

    Object.entries(reportData.stats?.breakdown || {}).forEach(
      ([key, value]) => {
        rows.push([`${formatFastingTypeLabel(key)} Total`, value?.total ?? ""]);
        rows.push([
          `${formatFastingTypeLabel(key)} Served`,
          value?.served ?? "",
        ]);
        rows.push([
          `${formatFastingTypeLabel(key)} Unserved`,
          value?.unserved ?? "",
        ]);
      },
    );

    const safeCafe = toSafeFilePart(
      reportCafeOption?.label || reportData.cafeDisplayName || "cafes",
    );
    const safePeriod = toSafeFilePart(
      reportData.period?.startDate
        ? `${reportData.period.startDate}-${reportData.period.endDate || ""}`
        : "period",
    );

    downloadCsv(`${safeCafe}-${safePeriod}-report.csv`, rows);
  };

  const activeHistoryRangeLabel =
    HISTORY_RANGE_OPTIONS.find((item) => item.value === historyRange)?.label ||
    "Daily";
  const activeReportTypeLabel =
    REPORT_TYPES.find((item) => item.value === reportType)?.label || "Daily";

  return (
    <>
      <div className="page-shell relative min-h-[calc(100vh-5rem)] overflow-hidden px-4 pb-6 pt-3 md:px-6 md:pt-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-blue-200/20 blur-3xl" />
          <div className="absolute right-0 top-28 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-200/10 blur-3xl" />
        </div>
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden gap-5">
          <div className="surface-panel relative overflow-hidden rounded-[32px] border border-slate-200/80 p-6 md:p-8">
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.45em] text-blue-600/80">
                  Cafe Manager Meals
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                  {activeTab === "sessionHistory"
                    ? "Session Meal History"
                    : "Cafeteria Attendance Reports"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
                  {activeTab === "sessionHistory"
                    ? "Review a single meal session with clear counts for served, pending, regular, and internship students."
                    : "Build clear attendance reports for daily, weekly, or monthly periods with fasting breakdowns that are easy to scan."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Active View
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {activeTab === "sessionHistory"
                      ? "Meal Snapshot"
                      : "Attendance Report"}
                  </p>
                </div>
                <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Summary Range
                  </p>
                  <p className="mt-2 text-lg font-black text-blue-900">
                    {activeTab === "sessionHistory"
                      ? activeHistoryRangeLabel
                      : activeReportTypeLabel}
                  </p>
                </div>
                <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Cafes
                  </p>
                  <p className="mt-2 text-lg font-black text-emerald-900">
                    {cafeOptions.length.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-2 shadow-inner">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("sessionHistory")}
                  className={`rounded-[22px] px-4 py-3 text-left transition ${
                    activeTab === "sessionHistory"
                      ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <div className="text-sm font-bold">Session History</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Check one date and one meal session.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendanceReports")}
                  className={`rounded-[22px] px-4 py-3 text-left transition ${
                    activeTab === "attendanceReports"
                      ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <div className="text-sm font-bold">Attendance Reports</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Generate daily, weekly, or monthly reports.
                  </div>
                </button>
              </div>
            </div>
          </div>

          {activeTab === "sessionHistory" && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] overflow-y-auto pr-1">
              <div className="surface-card flex min-h-0 flex-col rounded-[28px] p-5">
                <h2 className="text-xl font-bold text-[var(--app-text)]">
                  Filters
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-soft)]">
                  Select the cafeteria, date, and meal session you want to
                  review.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Cafeteria
                    </span>
                    <select
                      value={selectedCafe}
                      onChange={(e) => setSelectedCafe(e.target.value)}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                    >
                      <option value="">All Cafes</option>
                      {cafeOptions.map((cafe) => (
                        <option key={cafe.value} value={cafe.value}>
                          {cafe.label}
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
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
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
                            className={`rounded-2xl border px-4 py-2.5 text-left transition ${
                              active
                                ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-white"
                            }`}
                          >
                            <div className="text-sm font-semibold">
                              {getMealLabel(mealType)}
                            </div>
                            <div className="mt-1 text-xs opacity-80">
                              {mealSchedule?.[mealType]?.label ||
                                "--:-- - --:--"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>

                <button
                  onClick={fetchMealSummary}
                  disabled={loadingSummary}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
                >
                  {loadingSummary ? "Loading Summary..." : "Show Meal Summary"}
                </button>

                {error && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-2.5 text-sm text-red-700 dark:text-red-400 animate-fadeIn">
                    {error}
                  </div>
                )}
              </div>

              <div className="surface-panel flex flex-col rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                  Snapshot
                </p>
                {mealSummary && (
                  <button
                    type="button"
                    onClick={handleExportMealSummary}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Export Summary
                  </button>
                )}

                {mealSummary ? (
                  <>
                    <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl text-[var(--app-text)]">
                      {formatSnapshotTitle(mealSummary)}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(mealSummary.date)} •{" "}
                        {getMealLabel(mealSummary.mealType)}
                      </p>
                    </div>
                    <div className="mt-3 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-800">
                      Applied time:{" "}
                      <span className="font-bold">
                        {formatAppliedWindow(
                          getAppliedWindowForSummary(mealSummary),
                        )}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="surface-panel rounded-3xl p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-[var(--app-text)]">
                              Student Snapshot
                            </h3>
                            <p className="mt-1 text-[11px] text-[var(--app-text-soft)]">
                              A quick view of regular, internship, served, and
                              pending students for {snapshotMealLabel}.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => setDetailMode("total")}
                          className={`rounded-3xl p-3 text-left ring-1 transition ${
                            detailMode === "total"
                              ? "bg-white ring-blue-300/50 ring-1"
                              : "bg-white ring-slate-200 ring-1 hover:bg-white"
                          }`}
                        >
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            Total Students
                          </p>
                          <p className="mt-1 text-2xl font-black text-blue-900 dark:text-blue-200">
                            {snapshotCounts.total}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                            Click to view fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDetailMode("regular")}
                          className={`rounded-3xl p-3 text-left ring-1 transition ${
                            detailMode === "regular"
                              ? "bg-white ring-blue-400/50 ring-1"
                              : "bg-white ring-blue-200 ring-1 hover:bg-white"
                          }`}
                        >
                          <p className="text-sm text-blue-700 dark:text-blue-400 text-slate-900 dark:text-white">
                            Regular Students
                          </p>
                          <p className="mt-1 text-xl font-black text-blue-800 dark:text-blue-200">
                            {snapshotCounts.regular}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                            Click to view fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDetailMode("internship")}
                          className={`rounded-3xl p-3 text-left ring-1 transition ${
                            detailMode === "internship"
                              ? "bg-white ring-fuchsia-300/50 ring-1"
                              : "bg-white ring-fuchsia-200 ring-1 hover:bg-white"
                          }`}
                        >
                          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-400">
                            Internship Students
                          </p>
                          <p className="mt-1 text-xl font-black text-fuchsia-800 dark:text-fuchsia-200">
                            {snapshotCounts.internship}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
                            Click to view fasting breakdown
                          </p>
                        </button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setDetailMode("served")}
                          className={`rounded-3xl p-3 text-left ring-1 transition ${
                            detailMode === "served"
                              ? "bg-white ring-emerald-300/50 ring-1"
                              : "bg-white ring-emerald-200 ring-1 hover:bg-white"
                          }`}
                        >
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            Served Today
                          </p>
                          <p className="text-xs text-emerald-400">
                            {snapshotMealLabel}
                          </p>
                          <p className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-200">
                            {snapshotCounts.served}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            Click to view fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDetailMode("notServed")}
                          className={`rounded-3xl p-3 text-left ring-1 transition ${
                            detailMode === "notServed"
                              ? "bg-white ring-amber-300/50 ring-1"
                              : "bg-white ring-amber-200 ring-1 hover:bg-white"
                          }`}
                        >
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            Pending
                          </p>
                          <p className="text-xs text-amber-400">
                            {snapshotMealLabel}
                          </p>
                          <p className="mt-1 text-xl font-black text-amber-800 dark:text-amber-200">
                            {snapshotCounts.pending}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            Click to view fasting breakdown
                          </p>
                        </button>
                      </div>

                      {mealSummary?.fastingBreakdown && (
                        <div className="rounded-3xl bg-white p-3 ring-1 ring-slate-200 mt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                Fasting Breakdown
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {getBreakdownTitle()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-white p-2.5 ring-1 ring-amber-200">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Fasting
                              </p>
                              <p className="mt-2 text-lg font-black leading-none text-amber-800 dark:text-amber-200 tabular-nums">
                                {activeBreakdown?.fasting ?? 0}
                              </p>
                            </div>
                            <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-white p-2.5 ring-1 ring-violet-200">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                                Sunday Fasting
                              </p>
                              <p className="mt-2 text-lg font-black leading-none text-violet-800 dark:text-violet-200 tabular-nums">
                                {activeBreakdown?.sundayFasting ?? 0}
                              </p>
                            </div>
                            <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-white p-2.5 ring-1 ring-emerald-200">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Muslim Fasting
                              </p>
                              <p className="mt-2 text-lg font-black leading-none text-emerald-800 dark:text-emerald-200 tabular-nums">
                                {activeBreakdown?.muslimFasting ?? 0}
                              </p>
                            </div>
                            <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-white p-2.5 ring-1 ring-slate-200">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                                Not Fasting
                              </p>
                              <p className="mt-2 text-lg font-black leading-none text-slate-900 dark:text-white tabular-nums">
                                {activeBreakdown?.notFasting ?? 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                    Pick a date and session, then load the summary to see meal
                    history for that exact selection.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "attendanceReports" && (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] overflow-y-auto pr-1 pb-1">
              <div className="surface-card flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[var(--app-text)]">
                  Report Filters
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-soft)]">
                  Select the period type, cafeteria, and time range to calculate
                  attendance.
                </p>

                <div className="mt-4 grid gap-4">
                  <div>
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Report Type
                    </span>
                    <div className="flex gap-2">
                      {["daily", "weekly", "monthly"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setReportType(type)}
                          className={`flex-1 rounded-2xl border py-2.5 text-center text-sm font-semibold capitalize transition ${
                            reportType === type
                              ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-white"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Cafeteria
                    </span>
                    <select
                      value={reportCafe}
                      onChange={(e) => setReportCafe(e.target.value)}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                    >
                      <option value="">All Cafeterias</option>
                      {cafeOptions.map((cafe) => (
                        <option key={cafe.value} value={cafe.value}>
                          {cafe.label}
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
                        onChange={(e) => setReportDate(e.target.value)}
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
                          onChange={(e) => setReportStartDate(e.target.value)}
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
                          onChange={(e) => setReportEndDate(e.target.value)}
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
                          onChange={(e) => setReportMonth(e.target.value)}
                          className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                        >
                          <option value="1">January</option>
                          <option value="2">February</option>
                          <option value="3">March</option>
                          <option value="4">April</option>
                          <option value="5">May</option>
                          <option value="6">June</option>
                          <option value="7">July</option>
                          <option value="8">August</option>
                          <option value="9">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Year
                        </span>
                        <select
                          value={reportYear}
                          onChange={(e) => setReportYear(e.target.value)}
                          className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                        >
                          {["2025", "2026", "2027", "2028", "2029", "2030"].map(
                            (y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>
                  )}
                </div>

                <button
                  onClick={fetchReport}
                  disabled={loadingReport}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
                >
                  {loadingReport ? "Generating Report..." : "Generate Report"}
                </button>

                {reportError && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-2.5 text-sm text-red-700 dark:text-red-400 animate-fadeIn">
                    {reportError}
                  </div>
                )}
              </div>

              <div className="surface-panel flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm overflow-y-auto">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                  Report Summary
                </p>
                {reportData && (
                  <button
                    type="button"
                    onClick={handleExportReportSummary}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Export Summary
                  </button>
                )}

                {reportData ? (
                  <div className="mt-2 flex flex-col h-full">
                    <h2 className="text-2xl font-black leading-tight text-[var(--app-text)] md:text-3xl">
                      {reportCafeOption?.label ||
                        (reportData.cafeNumber
                          ? reportData.cafeDisplayName ||
                            `Cafe ${reportData.cafeNumber}`
                          : "All Cafes")}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {reportType === "daily"
                        ? `Daily report for ${reportData.period.startDate}`
                        : reportType === "weekly"
                          ? `Weekly report from ${reportData.period.startDate} to ${reportData.period.endDate}`
                          : `Monthly report for ${reportData.period.startDate.split("-").slice(0, 2).join("-")}`}
                    </p>

                    <div className="grid gap-3 grid-cols-3 mt-5">
                      <div className="rounded-3xl bg-white border border-blue-100 p-4 text-left">
                        <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                          Total Regular
                        </p>
                        <p className="mt-1 text-2xl font-black text-blue-900">
                          {reportData.stats.totalRegular.toLocaleString()}
                        </p>
                      </div>

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
                                (reportData.stats.totalRegular || 1)) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                          <span>
                            Unserved (
                            {(
                              (reportData.stats.totalUnserved /
                                (reportData.stats.totalRegular || 1)) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                        <div className="w-full h-4 rounded-full bg-white overflow-hidden flex">
                          <div
                            style={{
                              width: `${(reportData.stats.totalServed / (reportData.stats.totalRegular || 1)) * 100}%`,
                            }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          />
                          <div
                            style={{
                              width: `${(reportData.stats.totalUnserved / (reportData.stats.totalRegular || 1)) * 100}%`,
                            }}
                            className="h-full bg-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex-1">
                      <h3 className="text-sm font-bold text-[var(--app-text)] mb-3">
                        Attendance Breakdown by Fasting Type
                      </h3>
                      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                              <th className="px-4 py-3">Fasting Type</th>
                              <th className="px-4 py-3 text-right">
                                Total Students
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
                                    className={`h-full bg-gradient-to-r ${color}`}
                                  />
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                    <p className="font-semibold">No report generated yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pick your parameters on the left and click &quot;Generate
                      Report&quot;.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
