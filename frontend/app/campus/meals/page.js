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

const formatDateTime = (value) => {
  if (!value) return "Not opened yet";

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
  const [historyRange, setHistoryRange] = useState("daily"); // daily, weekly, monthly

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setError("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [error]);

  const cafeNumbers = useMemo(
    () => currentCampus?.cafeNumbers || [1],
    [currentCampus?.cafeNumbers],
  );

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

    if (mealSummary?.noDataReason === "upcoming") {
      return "This meal session has not started yet.";
    }

    if (mealSummary?.noDataReason === "before_system_start") {
      return "No data is available because this date is before tracking started.";
    }

    return "No data is available for that date and session.";
  };

  useEffect(() => {
    setSelectedDate(getAppDayString());
  }, []);

  useEffect(() => {
    const fetchMealSchedule = async () => {
      if (!currentCampus || !selectedDate) {
        setMealSchedule(null);
        return;
      }

      try {
        const params = new URLSearchParams({ date: selectedDate });
        const res = await fetch(
          `${url}/campus/schedule?${params.toString()}`,
          {
            credentials: "include",
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error("Failed to load meal schedule");
        }

        setMealSchedule(data.schedule || null);
      } catch {
        setMealSchedule(null);
      }
    };

    fetchMealSchedule();
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
        mealSummary.cafeDisplayName || `Cafe ${mealSummary.cafeNumber || ""}`,
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
      ["Total Fasting", mealSummary.fastingBreakdown?.fasting ?? ""],
      [
        "Total Sunday Fasting",
        mealSummary.fastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Total Muslim Fasting",
        mealSummary.fastingBreakdown?.muslimFasting ?? "",
      ],
      ["Total Not Fasting", mealSummary.fastingBreakdown?.notFasting ?? ""],
      ["Regular Fasting", mealSummary.regularFastingBreakdown?.fasting ?? ""],
      [
        "Regular Sunday Fasting",
        mealSummary.regularFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Regular Muslim Fasting",
        mealSummary.regularFastingBreakdown?.muslimFasting ?? "",
      ],
      ["Regular Not Fasting", mealSummary.regularFastingBreakdown?.notFasting ?? ""],
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
      ["Internship Not Fasting", mealSummary.internshipFastingBreakdown?.notFasting ?? ""],
      ["Served Fasting", mealSummary.servedFastingBreakdown?.fasting ?? ""],
      [
        "Served Sunday Fasting",
        mealSummary.servedFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Served Muslim Fasting",
        mealSummary.servedFastingBreakdown?.muslimFasting ?? "",
      ],
      ["Served Not Fasting", mealSummary.servedFastingBreakdown?.notFasting ?? ""],
      ["Pending Fasting", mealSummary.notServedFastingBreakdown?.fasting ?? ""],
      [
        "Pending Sunday Fasting",
        mealSummary.notServedFastingBreakdown?.sundayFasting ?? "",
      ],
      [
        "Pending Muslim Fasting",
        mealSummary.notServedFastingBreakdown?.muslimFasting ?? "",
      ],
      ["Pending Not Fasting", mealSummary.notServedFastingBreakdown?.notFasting ?? ""],
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeCampusName = String(mealSummary.campusName || "campus").replace(
      /[^a-z0-9]+/gi,
      "-",
    );
    const safeMealType = String(mealSummary.mealType || "meal").replace(
      /[^a-z0-9]+/gi,
      "-",
    );
    const safeDate = mealSummary.date
      ? new Date(mealSummary.date).toISOString().split("T")[0]
      : "date";

    link.href = objectUrl;
    link.download = `${safeCampusName}-cafe-${mealSummary.cafeNumber || "all"}-${safeDate}-${safeMealType}-summary.csv`;
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

      const safeCampusName = String(mealSummary.campusName || "campus").replace(
        /[^a-z0-9]+/gi,
        "-",
      );
      const safeMealType = String(mealSummary.mealType || "meal").replace(
        /[^a-z0-9]+/gi,
        "-",
      );
      const safeDate = mealSummary.date
        ? new Date(mealSummary.date).toISOString().split("T")[0]
        : "date";

      downloadCsv(
        `${safeCampusName}-cafe-${mealSummary.cafeNumber || "all"}-${safeDate}-${safeMealType}-students.csv`,
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
    } catch (err) {
      setError(
        err.message ||
          "We could not load that meal summary right now. Please try again.",
      );
    } finally {
      setLoadingSummary(false);
    }
  }, [currentCampus, selectedDate, selectedMealType, historyRange, selectedCafe]);

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
      <div className="page-shell min-h-screen px-6 pb-12 pt-20 md:px-20 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <div className="surface-panel mb-8 rounded-[28px] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-500/80">
              Campus Meals
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl text-slate-900 dark:text-white">
              Meal Session History
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-400 md:text-base">
              Review history for any date and meal session, filtered by total
              campus history or specific cafeterias.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${historyRange === "daily" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800"}`}
                onClick={() => setHistoryRange("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${historyRange === "weekly" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800"}`}
                onClick={() => setHistoryRange("weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${historyRange === "monthly" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800"}`}
                onClick={() => setHistoryRange("monthly")}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-card rounded-[28px] p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Filters</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select the cafeteria, date, and meal session you want to review.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cafeteria
                  </span>
                  <select
                    value={selectedCafe}
                    onChange={(e) => setSelectedCafe(e.target.value)}
                    className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                  >
                    <option value="">Total History (All Cafes)</option>
                    {cafeNumbers.map((num) => (
                      <option key={num} value={num}>
                        Cafe {num}
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

            <div className="surface-panel rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                Snapshot
              </p>

              {mealSummary ? (
                <>
                  <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl text-slate-900 dark:text-white">
                    {mealSummary.cafeDisplayName || mealSummary.campusName}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
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
                            {formatDateTime(mealSummary.actualMealWindow?.openedAt)}
                          </p>
                        </div>
                      )}
                      {shouldShowClosingTime && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                            Session End
                          </p>
                          <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                            {formatDateTime(validActualClosedAt)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                          Scheduled Window
                        </p>
                        <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                          {formatWindowTime(mealSummary.appliedMealWindow?.label)}
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldShowSnapshotSection && (
                    <div className="mt-6 space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => !shouldHideCounts && setDetailMode("total")}
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "total"
                              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300/50 dark:border-blue-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                            <p className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-400">
                            {shouldHideCounts ? "-" : snapshotCounts.total}
                          </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-500">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => !shouldHideCounts && setDetailMode("regular")}
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "regular"
                              ? "bg-sky-50 dark:bg-sky-950/20 border-sky-300/50 dark:border-sky-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Regular Students</p>
                          <p className="mt-2 text-3xl font-black text-sky-700 dark:text-sky-400">
                            {shouldHideCounts ? "-" : snapshotCounts.regular}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-500">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => !shouldHideCounts && setDetailMode("internship")}
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "internship"
                              ? "bg-fuchsia-50 dark:bg-fuchsia-950/20 border-fuchsia-300/50 dark:border-fuchsia-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">Internship Students</p>
                          <p className="mt-2 text-3xl font-black text-fuchsia-700 dark:text-fuchsia-400">
                            {shouldHideCounts ? "-" : snapshotCounts.internship}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => !shouldHideCounts && setDetailMode("served")}
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition ${
                            detailMode === "served"
                              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300/50 dark:border-emerald-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">Served Today</p>
                          <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">
                            {shouldHideCounts ? "-" : snapshotCounts.served}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            Fasting breakdown
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => !shouldHideCounts && setDetailMode("notServed")}
                          disabled={shouldHideCounts}
                          className={`rounded-3xl p-5 text-left border transition md:col-span-2 ${
                            detailMode === "notServed"
                              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300/50 dark:border-amber-800"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
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
                          <h3 className="font-bold text-slate-900 dark:text-white">{getBreakdownTitle()}</h3>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/10 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">Fasting</p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.fasting ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/10 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">Sunday Fasting</p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.sundayFasting ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">Muslim Fasting</p>
                              <p className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                {activeBreakdown.muslimFasting ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-4">
                              <p className="text-xs uppercase text-slate-500 font-semibold">Not Fasting</p>
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
                  Select a cafeteria, date, and meal session to view the historical snapshot record.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
