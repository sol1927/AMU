"use client";

import { useEffect, useState, useCallback } from "react";
import { downloadCsv } from "@/app/utils/exportCsv";
import {
  getAppDayString,
  getAppMonth,
  getAppYear,
} from "@/app/utils/appTimezone";

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

export default function CafeMealsPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [mealSummary, setMealSummary] = useState(null);
  const [detailMode, setDetailMode] = useState("total");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");
  const [mealSchedule, setMealSchedule] = useState(null);
  const [historyRange, setHistoryRange] = useState("daily");
  const [exportingStudents, setExportingStudents] = useState(false);

  useEffect(() => {
    setSelectedDate(getAppDayString());
  }, []);

  useEffect(() => {
    const fetchMealSchedule = async () => {
      try {
        const params = new URLSearchParams({ date: selectedDate });
        const res = await fetch(
          `${url}/cafe/meal-schedule?${params.toString()}`,
          {
            credentials: "include",
          },
        );
        const data = await res.json();
        setMealSchedule(data.schedule || null);
      } catch {
        setMealSchedule(null);
      }
    };
    if (selectedDate) fetchMealSchedule();
  }, [selectedDate]);

  const fetchMealSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError("");
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        mealType: selectedMealType,
        historyRange,
      });
      const res = await fetch(`${url}/cafe/meals?${params.toString()}`, {
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
  }, [selectedDate, selectedMealType, historyRange]);

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
      <div className="page-shell min-h-screen px-6 pb-12 pt-20 md:px-20 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <div className="surface-card mb-8 rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200 bg-white/80">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-400/80">
              Dashboard Meals
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl text-blue-700">
              Session Meal History
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
              Check one date and one session to see how many students were
              available, served, and not served without listing individual
              students.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${historyRange === "daily" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
                onClick={() => setHistoryRange("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${historyRange === "weekly" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
                onClick={() => setHistoryRange("weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${historyRange === "monthly" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
                onClick={() => setHistoryRange("monthly")}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-card rounded-[28px] p-6 shadow-sm border border-slate-200 bg-white/80">
              <h2 className="text-xl font-bold">Filters</h2>
              <p className="mt-2 text-sm text-slate-500">
                Select the date and meal session you want to review.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
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
                onClick={fetchMealSummary}
                disabled={loadingSummary}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSummary ? "Loading Summary..." : "Show Meal Summary"}
              </button>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="surface-panel rounded-[28px] p-6 shadow-sm border border-slate-100 bg-white/90">
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
                  </div>
                  <div className="mt-6 grid gap-4">
                    <div className="surface-panel rounded-3xl p-6 shadow-sm border border-slate-100 bg-white/90">
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
                            ? "bg-blue-50 ring-blue-300/50"
                            : "bg-white ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm text-blue-700">Total Students</p>
                        <p className="mt-2 text-4xl font-black text-blue-900">
                          {snapshotCounts.total}
                        </p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
                          Click to view fasting breakdown
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailMode("regular")}
                        className={`rounded-3xl p-5 text-left ring-1 transition ${
                          detailMode === "regular"
                            ? "bg-blue-100 ring-blue-400/50"
                            : "bg-blue-50/60 ring-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        <p className="text-sm text-blue-700">
                          Regular Students
                        </p>
                        <p className="mt-2 text-3xl font-black text-blue-800">
                          {snapshotCounts.regular}
                        </p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
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
                        <p className="text-sm text-emerald-700">Served Today</p>
                        <p className="text-xs text-emerald-400">
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
                            ? "bg-amber-50 ring-amber-300/50"
                            : "bg-amber-50/70 ring-amber-200 hover:bg-amber-50"
                        }`}
                      >
                        <p className="text-sm text-amber-700">Pending</p>
                        <p className="text-xs text-amber-400">
                          {snapshotMealLabel}
                        </p>
                        <p className="mt-2 text-3xl font-black text-amber-800">
                          {snapshotCounts.pending}
                        </p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-600">
                          Click to view fasting breakdown
                        </p>
                      </button>
                    </div>

                    {mealSummary?.fastingBreakdown && (
                      <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200 mt-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Fasting Breakdown
                            </p>
                            <p className="text-sm text-slate-600">
                              {getBreakdownTitle()}
                            </p>
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
