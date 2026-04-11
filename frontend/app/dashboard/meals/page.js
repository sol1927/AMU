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
      return "border-emerald-300/30 bg-emerald-400/15 text-emerald-200";
    case "completed":
      return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100";
    case "upcoming":
      return "border-amber-300/20 bg-amber-400/10 text-amber-100";
    default:
      return "border-white/15 bg-white/10 text-white";
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
        setCampuses(campusList);

        if (campusList.length > 0) {
          setSelectedCampus(campusList[0]._id);
        }
      } catch (err) {
        console.error("Error fetching campuses:", err);
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
      setError("Please select campus, date, and session");
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
        throw new Error("Failed to fetch meal summary");
      }

      const data = await res.json();
      setMealSummary(data.summary || null);
    } catch (err) {
      console.error("Error fetching meal summary:", err);
      setError("Failed to fetch meal summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#111827_42%,_#172033_100%)] px-4 pb-10 pt-24 text-white md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
              Dashboard Meals
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Session Meal History
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
              Check one campus, one date, and one session to see how many
              students were available, served, and not served without listing
              individual students.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-bold">Filters</h2>
              <p className="mt-2 text-sm text-slate-400">
                Select the campus, date, and meal session you want to review.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    Campus
                  </span>
                  <select
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                    disabled={loadingCampuses}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
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
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    Date
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
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
                              ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >
                          <div className="text-sm font-semibold">
                            {getMealLabel(mealType)}
                          </div>
                          <div className="mt-1 text-xs opacity-80">
                            {mealType === "breakfast" && "06:00 - 09:00"}
                            {mealType === "lunch" && "11:00 - 14:00"}
                            {mealType === "dinner" && "17:00 - 20:00"}
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
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,_rgba(8,47,73,0.88),_rgba(15,23,42,0.88))] p-6 shadow-2xl backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                Snapshot
              </p>

              {mealSummary ? (
                <>
                  <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                    {mealSummary.campusName}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-300">
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

                  <div className="mt-6 grid gap-4">
                    {shouldHideCounts ? (
                      <div className="rounded-3xl border border-dashed border-amber-300/20 bg-amber-400/10 p-5 text-sm text-amber-100">
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
                                ? "bg-white/10 ring-cyan-300/40"
                                : "bg-white/6 ring-white/10 hover:bg-white/10"
                            }`}
                          >
                            <p className="text-sm text-slate-300">
                              Total Students
                            </p>
                            <p className="mt-2 text-4xl font-black text-white">
                              {mealSummary.totalStudents}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-300/80">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailMode("regular")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "regular"
                                ? "bg-sky-400/15 ring-sky-300/40"
                                : "bg-sky-400/10 ring-sky-300/20 hover:bg-sky-400/15"
                            }`}
                          >
                            <p className="text-sm text-sky-100">
                              Regular Students
                            </p>
                            <p className="mt-2 text-3xl font-black text-sky-300">
                              {mealSummary.regularStudents}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-200/80">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailMode("internship")}
                            className={`rounded-3xl p-5 text-left ring-1 transition ${
                              detailMode === "internship"
                                ? "bg-fuchsia-400/15 ring-fuchsia-300/40"
                                : "bg-fuchsia-400/10 ring-fuchsia-300/20 hover:bg-fuchsia-400/15"
                            }`}
                          >
                            <p className="text-sm text-fuchsia-100">
                              Internship Students
                            </p>
                            <p className="mt-2 text-3xl font-black text-fuchsia-300">
                              {mealSummary.internshipStudents}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-200/80">
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
                                ? "bg-emerald-400/15 ring-emerald-300/40"
                                : "bg-emerald-400/10 ring-emerald-300/20 hover:bg-emerald-400/15"
                            }`}
                          >
                            <p className="text-sm text-emerald-100">
                              Served Students
                            </p>
                            <p className="mt-2 text-3xl font-black text-emerald-300">
                              {mealSummary.servedStudents}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                              Click to view fasting breakdown
                            </p>
                          </button>

                          <div className="rounded-3xl bg-rose-400/10 p-5 ring-1 ring-rose-300/20">
                            <button
                              type="button"
                              onClick={() => setDetailMode("notServed")}
                              className={`w-full rounded-3xl p-5 text-left ring-1 transition ${
                                detailMode === "notServed"
                                  ? "bg-rose-400/15 ring-rose-300/40"
                                  : "bg-rose-400/10 ring-rose-300/20 hover:bg-rose-400/15"
                              }`}
                            >
                              <p className="text-sm text-rose-100">
                                Not Served Students
                              </p>
                              <p className="mt-2 text-3xl font-black text-rose-300">
                                {mealSummary.notServedStudents}
                              </p>
                              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-rose-200/80">
                                Click to view fasting breakdown
                              </p>
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl bg-white/6 p-5 ring-1 ring-white/10">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-slate-300">
                              {getBreakdownTitle()}
                            </p>
                            <div className="flex items-center gap-2 rounded-full bg-white/5 p-1">
                              <button
                                type="button"
                                onClick={() => setDetailMode("total")}
                                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                  detailMode === "total"
                                    ? "bg-cyan-400/20 text-cyan-200"
                                    : "text-slate-300 hover:bg-white/10"
                                }`}
                              >
                                Total
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailMode("regular")}
                                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                  detailMode === "regular"
                                    ? "bg-sky-400/20 text-sky-200"
                                    : "text-slate-300 hover:bg-white/10"
                                }`}
                              >
                                Regular
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailMode("internship")}
                                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                  detailMode === "internship"
                                    ? "bg-fuchsia-400/20 text-fuchsia-200"
                                    : "text-slate-300 hover:bg-white/10"
                                }`}
                              >
                                Internship
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailMode("served")}
                                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                  detailMode === "served"
                                    ? "bg-emerald-400/20 text-emerald-200"
                                    : "text-slate-300 hover:bg-white/10"
                                }`}
                              >
                                Served
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailMode("notServed")}
                                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                  detailMode === "notServed"
                                    ? "bg-rose-400/20 text-rose-200"
                                    : "text-slate-300 hover:bg-white/10"
                                }`}
                              >
                                Not Served
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-amber-400/10 p-4 ring-1 ring-amber-300/20">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
                                Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-amber-300">
                                {activeBreakdown?.fasting ?? 0}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-violet-400/10 p-4 ring-1 ring-violet-300/20">
                              <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">
                                Sunday Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-violet-300">
                                {activeBreakdown?.sundayFasting ?? 0}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-400/10 p-4 ring-1 ring-emerald-300/20">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                Muslim Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-emerald-300">
                                {activeBreakdown?.muslimFasting ?? 0}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-400/10 p-4 ring-1 ring-slate-300/20">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                                Not Fasting
                              </p>
                              <p className="mt-2 text-2xl font-black text-slate-200">
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
                <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
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
