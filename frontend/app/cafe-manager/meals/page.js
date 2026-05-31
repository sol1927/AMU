"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "../../context/UserContext";
import { getAppDayString } from "@/app/utils/appTimezone";

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

export default function CafeMealsPage() {
  const { currentUser } = useUser();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCafe, setSelectedCafe] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [mealSummary, setMealSummary] = useState(null);
  const [detailMode, setDetailMode] = useState("total");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");
  const [mealSchedule, setMealSchedule] = useState(null);
  const [historyRange, setHistoryRange] = useState("daily");
  const [cafeNumbers, setCafeNumbers] = useState([1]);

  useEffect(() => {
    const fetchCafeNumbers = async () => {
      try {
        const res = await fetch(`${url}/cafe/cafe-numbers`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCafeNumbers(
            Array.isArray(data.cafeNumbers) ? data.cafeNumbers : [1],
          );
        }
      } catch {
        setCafeNumbers([1]);
      }
    };
    fetchCafeNumbers();
  }, []);

  useEffect(() => {
    setSelectedDate(getAppDayString());
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

  const activeBreakdown = getActiveBreakdown();
  const snapshotMealLabel = getSnapshotMealLabel(mealSummary?.mealType);
  const snapshotCounts = {
    total: mealSummary?.totalStudents ?? 0,
    regular: mealSummary?.regularStudents ?? 0,
    internship: mealSummary?.internshipStudents ?? 0,
    served: mealSummary?.servedStudents ?? 0,
    pending: mealSummary?.notServedStudents ?? 0,
  };

  return (
    <>
      <div className="page-shell flex h-[calc(100vh-5rem)] flex-col overflow-hidden px-4 pb-4 pt-2 md:px-6 md:pt-3">
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden">
          <div className="surface-panel mb-4 rounded-[28px] p-5 md:p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-500/80">
              Cafe Manager Meals
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Session Meal History
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400 md:text-sm">
              Check one date and one session to see how many students were
              available, served, and not served without listing individual
              students.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  historyRange === "daily"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800"
                }`}
                onClick={() => setHistoryRange("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  historyRange === "weekly"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800"
                }`}
                onClick={() => setHistoryRange("weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  historyRange === "monthly"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800"
                }`}
                onClick={() => setHistoryRange("monthly")}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-card flex min-h-0 flex-col rounded-[28px] p-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Filters
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select the cafeteria, date, and meal session you want to review.
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
                    <option value="">Total History (All Cafes)</option>
                    {cafeNumbers.map((num) => (
                      <option key={num} value={num}>
                        Cafe {num}
                      </option>
                    ))}
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
                    className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900 dark:text-white"
                  />
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
                          className={`rounded-2xl border px-4 py-2.5 text-left transition ${
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

            <div className="surface-panel flex min-h-0 flex-col rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                Snapshot
              </p>

              {mealSummary ? (
                <>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-slate-900 dark:text-white md:text-3xl">
                    {mealSummary.cafeDisplayName || mealSummary.campusName}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(mealSummary.date)} •{" "}
                      {getMealLabel(mealSummary.mealType)}
                    </p>
                  </div>
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
                    Applied time:{" "}
                    <span className="font-bold">
                      {formatWindowTime(
                        mealSummary.appliedMealWindow?.label,
                        "--:-- - --:--",
                      )}
                    </span>
                  </div>
                  <div className="mt-3 grid min-h-0 gap-2 overflow-hidden">
                    <div className="surface-panel rounded-3xl p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Student Snapshot
                          </h3>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
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
                            ? "bg-blue-50 dark:bg-blue-950/20 ring-blue-300/50 dark:ring-blue-800"
                            : "bg-white dark:bg-slate-950 ring-slate-200 dark:ring-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900"
                        }`}
                      >
                        <p className="text-sm text-blue-700">Total Students</p>
                        <p className="mt-1 text-2xl font-black text-blue-900">
                          {snapshotCounts.total}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                          Click to view fasting breakdown
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailMode("regular")}
                        className={`rounded-3xl p-3 text-left ring-1 transition ${
                          detailMode === "regular"
                            ? "bg-blue-100 dark:bg-blue-950/30 ring-blue-400/50 dark:ring-blue-800"
                            : "bg-blue-50/60 dark:bg-blue-950/10 ring-blue-200 dark:ring-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                        }`}
                      >
                        <p className="text-sm text-blue-700">
                          Regular Students
                        </p>
                        <p className="mt-1 text-xl font-black text-blue-800">
                          {snapshotCounts.regular}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                          Click to view fasting breakdown
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailMode("internship")}
                        className={`rounded-3xl p-3 text-left ring-1 transition ${
                          detailMode === "internship"
                            ? "bg-fuchsia-50 dark:bg-fuchsia-950/20 ring-fuchsia-300/50 dark:ring-fuchsia-800"
                            : "bg-fuchsia-50/70 dark:bg-fuchsia-950/10 ring-fuchsia-200 dark:ring-fuchsia-900 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/20"
                        }`}
                      >
                        <p className="text-sm text-fuchsia-700">
                          Internship Students
                        </p>
                        <p className="mt-1 text-xl font-black text-fuchsia-800">
                          {snapshotCounts.internship}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-600">
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
                            ? "bg-emerald-50 dark:bg-emerald-950/20 ring-emerald-300/50 dark:ring-emerald-800"
                            : "bg-emerald-50/70 dark:bg-emerald-950/10 ring-emerald-200 dark:ring-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        }`}
                      >
                        <p className="text-sm text-emerald-700">Served Today</p>
                        <p className="text-xs text-emerald-400">
                          {snapshotMealLabel}
                        </p>
                        <p className="mt-1 text-xl font-black text-emerald-800">
                          {snapshotCounts.served}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          Click to view fasting breakdown
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailMode("notServed")}
                        className={`rounded-3xl p-3 text-left ring-1 transition ${
                          detailMode === "notServed"
                            ? "bg-amber-50 dark:bg-amber-950/20 ring-amber-300/50 dark:ring-amber-800"
                            : "bg-amber-50/70 dark:bg-amber-950/10 ring-amber-200 dark:ring-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        }`}
                      >
                        <p className="text-sm text-amber-700">Pending</p>
                        <p className="text-xs text-amber-400">
                          {snapshotMealLabel}
                        </p>
                        <p className="mt-1 text-xl font-black text-amber-800">
                          {snapshotCounts.pending}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                          Click to view fasting breakdown
                        </p>
                      </button>
                    </div>

                    {mealSummary?.fastingBreakdown && (
                      <div className="rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-200 mt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">
                              Fasting Breakdown
                            </p>
                            <p className="text-xs text-slate-600">
                              {getBreakdownTitle()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-amber-50 p-2.5 ring-1 ring-amber-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Fasting
                            </p>
                            <p className="mt-2 text-lg font-black leading-none text-amber-800 tabular-nums">
                              {activeBreakdown?.fasting ?? 0}
                            </p>
                          </div>
                          <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-violet-50 p-2.5 ring-1 ring-violet-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                              Sunday Fasting
                            </p>
                            <p className="mt-2 text-lg font-black leading-none text-violet-800 tabular-nums">
                              {activeBreakdown?.sundayFasting ?? 0}
                            </p>
                          </div>
                          <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-emerald-50 p-2.5 ring-1 ring-emerald-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Muslim Fasting
                            </p>
                            <p className="mt-2 text-lg font-black leading-none text-emerald-800 tabular-nums">
                              {activeBreakdown?.muslimFasting ?? 0}
                            </p>
                          </div>
                          <div className="flex min-h-[88px] flex-col justify-between rounded-2xl bg-slate-100 p-2.5 ring-1 ring-slate-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                              Not Fasting
                            </p>
                            <p className="mt-2 text-lg font-black leading-none text-slate-900 tabular-nums">
                              {activeBreakdown?.notFasting ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  Pick a date and session, then load the summary to see meal
                  history for that exact selection.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
