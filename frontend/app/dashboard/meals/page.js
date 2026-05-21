"use client";

import { React, useCallback, useEffect, useState } from "react";
import AdminNavbar from "@/app/components/AdminNavbar";
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
      return "border-emerald-300/50 bg-emerald-50 text-emerald-700";
    case "logged_out":
      return "border-rose-300/50 bg-rose-50 text-rose-700";
    case "not_opened":
      return "border-slate-300 bg-slate-50 text-slate-700";
    case "completed":
      return "border-cyan-300/50 bg-cyan-50 text-cyan-700";
    case "upcoming":
      return "border-amber-300/50 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
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

export default function MealsPage() {
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedCafeNumber, setSelectedCafeNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [mealSummary, setMealSummary] = useState(null);
  const [detailMode, setDetailMode] = useState("total");
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [error, setError] = useState("");
  const [mealSchedule, setMealSchedule] = useState(null);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setError("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [error]);

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
    const fetchCampuses = async () => {
      setLoadingCampuses(true);
      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });

        if (res.status === 401 || res.status === 403) {
          setCampuses([]);
          setSelectedCampus("");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load campuses");
        }

        const data = await res.json();
        const campusList = Array.isArray(data.campuses) ? data.campuses : [];
        campusList.sort((a, b) => a.name.localeCompare(b.name));
        setCampuses(campusList);

        if (campusList.length > 0) {
          setSelectedCampus(campusList[0]._id);
          const firstCampusCafeNumbers = campusList[0].cafeNumbers || [1];
          setSelectedCafeNumber(String(firstCampusCafeNumbers[0] || 1));
        }
      } catch {
        setError("Failed to load campuses");
      } finally {
        setLoadingCampuses(false);
      }
    };

    fetchCampuses();
  }, []);

  useEffect(() => {
    setSelectedDate(getAppDayString());
  }, []);

  useEffect(() => {
    const fetchMealSchedule = async () => {
      if (!selectedCampus || !selectedDate) {
        setMealSchedule(null);
        return;
      }

      try {
        const params = new URLSearchParams({ date: selectedDate });
        const res = await fetch(
          `${url}/dashboard/meal-schedule/${selectedCampus}?${params.toString()}`,
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
  }, [selectedCampus, selectedDate]);

  useEffect(() => {
    const matchedCampus = campuses.find(
      (campus) => campus._id === selectedCampus,
    );
    if (!matchedCampus) return;

    const availableCafeNumbers = matchedCampus.cafeNumbers || [1];
    if (!availableCafeNumbers.includes(Number(selectedCafeNumber))) {
      setSelectedCafeNumber(String(availableCafeNumbers[0] || 1));
    }
  }, [campuses, selectedCampus, selectedCafeNumber]);

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
        campusId: selectedCampus,
        date: selectedDate,
        mealType: selectedMealType,
        cafeNumber: selectedCafeNumber,
      });

      const res = await fetch(
        `${url}/dashboard/meals/students?${params.toString()}`,
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
    if (!selectedCampus || !selectedDate || !selectedMealType) {
      setError("Please choose a campus, date, and meal session first.");
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
        campusId: selectedCampus,
        date: selectedDate,
        mealType: selectedMealType,
        year: String(year),
        semester,
        cafeNumber: selectedCafeNumber,
      });

      const res = await fetch(`${url}/dashboard/meals?${params.toString()}`, {
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
  }, [selectedCampus, selectedDate, selectedMealType, selectedCafeNumber]);

  const handleShowHistory = async () => {
    await fetchMealSummary();
  };

  return (
    <>
      <AdminNavbar />
      <div className="page-shell px-4 pb-10 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="surface-panel mb-8 rounded-[28px] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
              Dashboard Meals
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Session Meal History
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
              Check one campus, one date, and one session to see how many
              students were available, served, and not served without listing
              individual students.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-card rounded-[28px] p-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <p className="mt-2 text-sm text-slate-500">
                Select the campus, date, and meal session you want to review.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Campus
                  </span>
                  <select
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                    disabled={loadingCampuses}
                    className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                  >
                    {loadingCampuses ? (
                      <option value="">Loading campuses...</option>
                    ) : campuses.length > 0 ? (
                      campuses.map((campus) => (
                        <option
                          key={campus._id}
                          value={campus._id}
                          className="text-black"
                        >
                          {campus.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No available campus</option>
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Date
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Cafe Number
                  </span>
                  <select
                    value={selectedCafeNumber}
                    onChange={(e) => setSelectedCafeNumber(e.target.value)}
                    className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                  >
                    {(
                      campuses.find((campus) => campus._id === selectedCampus)
                        ?.cafeNumbers || [1]
                    ).map((number) => (
                      <option key={number} value={String(number)}>
                        Cafe {number}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
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
                              ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                disabled={loadingSummary || loadingCampuses || !selectedCampus}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSummary
                  ? "Loading Summary..."
                  : !selectedCampus
                    ? "No available campus"
                    : "Show Meal Summary"}
              </button>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="surface-panel rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                Snapshot
              </p>

              {mealSummary ? (
                <>
                  <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                    {mealSummary.cafeDisplayName || mealSummary.campusName}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600">
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
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingSummary ? "Refreshing..." : "Refresh Live Data"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleExportMealStudents}
                      disabled={exportingStudents}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {exportingStudents ? "Exporting..." : "Export Students"}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSummary}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Export CSV
                    </button>
                  </div>
                  {shouldShowSessionMeta && (
                    <>
                      <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                        Applied time:{" "}
                        <span className="font-bold">
                          {mealSummary.appliedMealWindow?.label ||
                            "--:-- - --:--"}
                        </span>
                      </div>
                      <div
                        className={`mt-3 grid gap-3 ${
                          shouldShowClosingTime ? "sm:grid-cols-2" : ""
                        }`}
                      >
                        {shouldShowOpenedTime && (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            Cafe opening time:{" "}
                            <span className="font-bold">
                              {formatDateTime(
                                mealSummary.actualMealWindow?.openedAt,
                              )}
                            </span>
                          </div>
                        )}
                        {shouldShowClosingTime && (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            Cafe ending time:{" "}
                            <span className="font-bold">
                              {validActualClosedAt
                                ? formatDateTime(validActualClosedAt)
                                : formatWindowTime(
                                    mealSummary.appliedMealWindow?.end,
                                  )}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-6 grid gap-4">
                    {shouldShowSnapshotSection ? (
                      <>
                        <div className="surface-panel rounded-3xl p-6">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-2xl font-bold text-slate-900">
                                Student Snapshot
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                A quick view of regular, internship, served, and
                                pending students for {snapshotMealLabel}.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => setDetailMode("total")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "total"
                                ? "bg-cyan-50 ring-cyan-300/50"
                                : "bg-white ring-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <p className="text-sm text-slate-600">
                              Total Students
                            </p>
                            <p className="mt-2 text-4xl font-black text-slate-900">
                              {snapshotCounts.total}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailMode("regular")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "regular"
                                ? "bg-sky-50 ring-sky-300/50"
                                : "bg-sky-50/60 ring-sky-200 hover:bg-sky-50"
                            }`}
                          >
                            <p className="text-sm text-sky-700">
                              Regular Students
                            </p>
                            <p className="mt-2 text-3xl font-black text-sky-800">
                              {snapshotCounts.regular}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-600">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailMode("internship")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "internship"
                                ? "bg-fuchsia-50 ring-fuchsia-300/50"
                                : "bg-fuchsia-50/70 ring-fuchsia-200 hover:bg-fuchsia-50"
                            }`}
                          >
                            <p className="text-sm text-fuchsia-700">
                              Internship Students
                            </p>
                            <p className="mt-2 text-3xl font-black text-fuchsia-800">
                              {snapshotCounts.internship}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                              Click to view fasting breakdown
                            </p>
                          </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setDetailMode("served")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "served"
                                ? "bg-emerald-50 ring-emerald-300/50"
                                : "bg-emerald-50/70 ring-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            <p className="text-sm text-emerald-700">
                              Served Today
                            </p>
                            <p className="text-xs text-slate-400">
                              {snapshotMealLabel}
                            </p>
                            <p className="mt-2 text-3xl font-black text-emerald-800">
                              {snapshotCounts.served}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailMode("notServed")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "notServed"
                                ? "bg-rose-50 ring-rose-300/50"
                                : "bg-rose-50/70 ring-rose-200 hover:bg-rose-50"
                            }`}
                          >
                            <p className="text-sm text-rose-700">Pending</p>
                            <p className="text-xs text-slate-400">
                              {snapshotMealLabel}
                            </p>
                            <p className="mt-2 text-3xl font-black text-rose-800">
                              {snapshotCounts.pending}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-rose-600">
                              Click to view fasting breakdown
                            </p>
                          </button>
                        </div>

                        {hasSnapshotData && (
                          <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  Fasting Breakdown
                                </p>
                                <p className="text-sm text-slate-600">
                                  {getBreakdownTitle()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setDetailMode("total")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    detailMode === "total"
                                      ? "bg-cyan-100 text-cyan-700"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Total
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDetailMode("regular")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    detailMode === "regular"
                                      ? "bg-sky-100 text-sky-700"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Regular
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDetailMode("internship")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    detailMode === "internship"
                                      ? "bg-fuchsia-100 text-fuchsia-700"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Internship
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDetailMode("served")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    detailMode === "served"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Served
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDetailMode("notServed")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    detailMode === "notServed"
                                      ? "bg-rose-100 text-rose-700"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Not Served
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="flex min-h-[132px] flex-col justify-between rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                  Fasting
                                </p>
                                <p className="mt-4 text-2xl font-black leading-none text-amber-800 tabular-nums">
                                  {activeBreakdown?.fasting ?? 0}
                                </p>
                              </div>

                              <div className="flex min-h-[132px] flex-col justify-between rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                                  Sunday Fasting
                                </p>
                                <p className="mt-4 text-2xl font-black leading-none text-violet-800 tabular-nums">
                                  {activeBreakdown?.sundayFasting ?? 0}
                                </p>
                              </div>

                              <div className="flex min-h-[132px] flex-col justify-between rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  Muslim Fasting
                                </p>
                                <p className="mt-4 text-2xl font-black leading-none text-emerald-800 tabular-nums">
                                  {activeBreakdown?.muslimFasting ?? 0}
                                </p>
                              </div>

                              <div className="flex min-h-[132px] flex-col justify-between rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                  Not Fasting
                                </p>
                                <p className="mt-4 text-2xl font-black leading-none text-slate-900 tabular-nums">
                                  {activeBreakdown?.notFasting ?? 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : shouldHideCounts ? (
                      getEmptyStateMessage() ? (
                        <div className="rounded-3xl border border-dashed border-amber-300/40 bg-amber-50 p-5 text-sm text-amber-700">
                          {getEmptyStateMessage()}
                        </div>
                      ) : null
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  Pick a campus, date, and session, then load the summary to see
                  meal history for that exact selection.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
