"use client";

import { React, useEffect, useState } from "react";
import AdminNavbar from "@/app/components/AdminNavbar";

const url = process.env.NEXT_PUBLIC_API_URL;

const getSemesterFromDate = (date) => {
  const month = new Date(date).getMonth() + 1;
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

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const getStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "Active";
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
    case "completed":
      return "border-cyan-300/50 bg-cyan-50 text-cyan-700";
    case "upcoming":
      return "border-amber-300/50 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
};

export default function MealsPage() {
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("breakfast");
  const [mealSummary, setMealSummary] = useState(null);
  const [detailMode, setDetailMode] = useState("total");
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
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

  const shouldHideCounts =
    mealSummary?.sessionStatus === "upcoming" ||
    mealSummary?.totalStudents === null;

  const getEmptyStateMessage = () => {
    if (mealSummary?.noDataReason === "before_system_start") {
      return "No historical data is available for that session because it is before this campus started using the system.";
    }

    return "Upcoming sessions do not show total, served, or not served students yet because attendance is not known at that session time.";
  };

  useEffect(() => {
    const fetchCampuses = async () => {
      setLoadingCampuses(true);
      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load campuses");
        }

        const data = await res.json();
        const campusList = Array.isArray(data.campuses) ? data.campuses : [];
        campusList.sort((a, b) => a.name.localeCompare(b.name));
        setCampuses(campusList);

        if (campusList.length > 0) {
          setSelectedCampus(campusList[0]._id);
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
    const today = new Date();
    const formattedToday = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0];

    setSelectedDate(formattedToday);
  }, []);

  useEffect(() => {
    const fetchMealSchedule = async () => {
      if (!selectedCampus) {
        setMealSchedule(null);
        return;
      }

      try {
        const res = await fetch(
          `${url}/dashboard/meal-schedule/${selectedCampus}`,
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
  }, [selectedCampus]);

  useEffect(() => {
    setDetailMode("total");
  }, [mealSummary]);

  const getBreakdownTitle = () => {
    switch (detailMode) {
      case "total":
        return "Total Students by Fasting Type";
      case "regular":
        return "Regular Students by Fasting Type";
      case "internship":
        return "Internship Students by Fasting Type";
      case "served":
        return "Served Students by Fasting Type";
      case "notServed":
        return "Not Served Students by Fasting Type";
      default:
        return "Students by Fasting Type";
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

  const handleShowHistory = async () => {
    if (!selectedCampus || !selectedDate || !selectedMealType) {
      setError("Please choose a campus, date, and meal session first.");
      return;
    }

    const year = new Date(selectedDate).getFullYear();
    const semester = getSemesterFromDate(selectedDate);

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
                    {campuses.map((campus) => (
                      <option
                        key={campus._id}
                        value={campus._id}
                        className="text-black"
                      >
                        {campus.name}
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
                onClick={handleShowHistory}
                disabled={loadingSummary || loadingCampuses}
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

            <div className="surface-panel rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                Snapshot
              </p>

              {mealSummary ? (
                <>
                  <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                    {mealSummary.campusName}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600">
                      {formatDate(mealSummary.date)} •{" "}
                      {getMealLabel(mealSummary.mealType)}
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${getStatusClasses(
                        mealSummary.sessionStatus,
                      )}`}
                    >
                      {getStatusLabel(mealSummary.sessionStatus)}
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                    Applied time:{" "}
                    <span className="font-bold">
                      {mealSummary.appliedMealWindow?.label || "--:-- - --:--"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {shouldHideCounts ? (
                      <div className="rounded-3xl border border-dashed border-amber-300/40 bg-amber-50 p-5 text-sm text-amber-700">
                        {getEmptyStateMessage()}
                      </div>
                    ) : (
                      <>
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
                              {mealSummary.totalStudents}
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
                              {mealSummary.regularStudents}
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
                              {mealSummary.internshipStudents}
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
                              Served Students
                            </p>
                            <p className="mt-2 text-3xl font-black text-emerald-800">
                              {mealSummary.servedStudents}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <div className="rounded-3xl bg-rose-50 p-5 ring-1 ring-rose-200">
                            <button
                              type="button"
                              onClick={() => setDetailMode("notServed")}
                              className={`w-full rounded-3xl p-5 text-left ring-1 transition ${
                                detailMode === "notServed"
                                  ? "bg-rose-50 ring-rose-300/50"
                                  : "bg-rose-50/70 ring-rose-200 hover:bg-rose-50"
                              }`}
                            >
                              <p className="text-sm text-rose-700">
                                Not Served Students
                              </p>
                              <p className="mt-2 text-3xl font-black text-rose-800">
                                {mealSummary.notServedStudents}
                              </p>
                              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-rose-600">
                                Click to view fasting breakdown
                              </p>
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-slate-600">
                              {getBreakdownTitle()}
                            </p>
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
                            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-amber-800">
                                {activeBreakdown?.fasting ?? 0}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200">
                              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                                Sunday Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-violet-800">
                                {activeBreakdown?.sundayFasting ?? 0}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                Muslim Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-emerald-800">
                                {activeBreakdown?.muslimFasting ?? 0}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                Not Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-slate-900">
                                {activeBreakdown?.notFasting ?? 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
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
