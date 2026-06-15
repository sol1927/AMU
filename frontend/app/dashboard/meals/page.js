"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavbar from "@/app/components/AdminNavbar";
import { downloadCsv } from "@/app/utils/exportCsv";
import { getAppDayString } from "@/app/utils/appTimezone";

const url = process.env.NEXT_PUBLIC_API_URL;

const formatFastingTypeLabel = (type) => {
  if (!type) return "Not Fasting";
  if (type === "not_fasting") return "Not Fasting";
  if (type === "fasting") return "Orthodox Fasting";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getReportTypeLabel = (type) => {
  if (type === "daily") return "Daily";
  if (type === "weekly") return "Weekly";
  if (type === "monthly") return "Monthly";
  return "Report";
};

const getMealLabel = (mealType) => {
  if (mealType === "breakfast") return "Breakfast";
  if (mealType === "lunch") return "Lunch";
  if (mealType === "dinner") return "Dinner";
  return "All Sessions";
};

const REPORT_MEAL_SESSIONS = [
  { value: "total", label: "Total", detail: "All Sessions" },
  { value: "breakfast", label: "Breakfast", detail: "--:-- - --:--" },
  { value: "lunch", label: "Lunch", detail: "--:-- - --:--" },
  { value: "dinner", label: "Dinner", detail: "--:-- - --:--" },
];

const toSafeFilePart = (value, fallback = "report") =>
  String(value || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || fallback;

export default function MealsPage() {
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [reportType, setReportType] = useState("daily");
  const [reportCafe, setReportCafe] = useState("");
  const [reportMealSession, setReportMealSession] = useState("total");
  const [reportDate, setReportDate] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportData, setReportData] = useState(null);
  const [mealSchedule, setMealSchedule] = useState(null);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 3500);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!reportError) return undefined;
    const timer = setTimeout(() => setReportError(""), 4500);
    return () => clearTimeout(timer);
  }, [reportError]);

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

  useEffect(() => {
    const fetchCampuses = async () => {
      setLoadingCampuses(true);
      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load campuses.");
        }

        const campusList = Array.isArray(data.campuses) ? data.campuses : [];
        campusList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setCampuses(campusList);
        if (campusList.length > 0) {
          setSelectedCampus(campusList[0]._id || campusList[0].id || "");
        }
      } catch (err) {
        setError(err.message || "Failed to load campuses.");
      } finally {
        setLoadingCampuses(false);
      }
    };

    fetchCampuses();
  }, []);

  useEffect(() => {
    setReportData(null);
    setReportError("");
  }, [
    reportCafe,
    reportMealSession,
    reportDate,
    reportStartDate,
    reportEndDate,
    reportMonth,
    reportYear,
    reportType,
  ]);

  useEffect(() => {
    setReportData(null);
    setReportCafe("");
    setReportError("");
  }, [selectedCampus]);

  const selectedCampusData = useMemo(
    () =>
      campuses.find(
        (campus) =>
          campus._id === selectedCampus || campus.id === selectedCampus,
      ) || null,
    [campuses, selectedCampus],
  );

  useEffect(() => {
    const fetchInitialSchedule = async () => {
      if (!selectedCampus) return;
      try {
        const campusIdForReport =
          selectedCampusData?.campusId ?? selectedCampus;
        const today = getAppDayString();
        const params = new URLSearchParams();
        params.append("campusId", campusIdForReport);
        params.append("date", today);
        const res = await fetch(`${url}/reports/daily?${params.toString()}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.mealSchedule) {
            setMealSchedule(data.mealSchedule);
          }
        }
      } catch (err) {
        console.error("Error fetching initial schedule:", err);
      }
    };
    fetchInitialSchedule();
  }, [selectedCampus, selectedCampusData]);

  const cafeOptions = useMemo(() => {
    const cafes = selectedCampusData?.cafes || [];
    return cafes
      .map((cafe, index) => {
        const value = String(cafe.cafeNumber ?? cafe.id ?? index + 1);
        const label =
          cafe.displayName || cafe.name || String(cafe.cafeNumber ?? value);
        return { value, label };
      })
      .filter((item) => item.value);
  }, [selectedCampusData]);

  const reportCafeLabel = useMemo(() => {
    const campusName = selectedCampusData?.name || reportData?.campusName || "";

    let baseCafeLabel = "";
    if (reportData?.cafeName) {
      baseCafeLabel = reportData.cafeName;
    } else {
      const cafeNumber = reportData?.cafeNumber ?? reportCafe;
      if (cafeNumber) {
        const match = cafeOptions.find(
          (item) => item.value === String(cafeNumber),
        );
        baseCafeLabel = match?.label || String(cafeNumber);
      }
    }

    if (baseCafeLabel) {
      if (
        campusName &&
        !baseCafeLabel.toLowerCase().includes(campusName.toLowerCase())
      ) {
        return `${campusName} ${baseCafeLabel}`;
      }
      return baseCafeLabel;
    }

    return campusName ? `${campusName} All Cafes` : "All Cafes";
  }, [reportData, reportCafe, cafeOptions, selectedCampusData]);

  const reportSummaryNotice = useMemo(() => {
    if (!reportData) return null;

    switch (reportData.noDataReason) {
      case "future":
      case "upcoming":
        return (
          <div className="space-y-1">
            <p className="font-bold">No data available for future dates.</p>
            <p>Attendance data has not been recorded yet.</p>
          </div>
        );
      case "before_system_start":
        return "No data is available because this date is before tracking started.";
      case "no_meal_record":
      case "no_data":
        return "No data is available for that date and session.";
      default:
        return null;
    }
  }, [reportData]);

  const fetchReport = useCallback(async () => {
    if (!selectedCampus) {
      setReportError("Please select a campus first.");
      return;
    }

    setLoadingReport(true);
    setReportError("");
    setReportData(null);

    try {
      const params = new URLSearchParams();
      const campusIdForReport = selectedCampusData?.campusId ?? selectedCampus;
      params.append("campusId", campusIdForReport);
      if (reportCafe) {
        params.append("cafeNumber", reportCafe);
      }
      if (reportMealSession && reportMealSession !== "total") {
        params.append("mealType", reportMealSession);
      }

      let endpoint = `${url}/reports/daily`;

      if (reportType === "daily") {
        if (!reportDate) {
          throw new Error("Please choose a report date.");
        }
        endpoint = `${url}/reports/daily`;
        params.append("date", reportDate);
      } else if (reportType === "weekly") {
        if (!reportStartDate || !reportEndDate) {
          throw new Error("Please choose a start and end date.");
        }
        endpoint = `${url}/reports/weekly`;
        params.append("startDate", reportStartDate);
        params.append("endDate", reportEndDate);
      } else if (reportType === "monthly") {
        if (!reportMonth || !reportYear) {
          throw new Error("Please choose a month and year.");
        }
        endpoint = `${url}/reports/monthly`;
        params.append("month", reportMonth);
        params.append("year", reportYear);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load attendance report.");
      }

      setReportData(data);
      if (data?.mealSchedule) {
        setMealSchedule(data.mealSchedule);
      }
    } catch (err) {
      setReportError(err.message || "Failed to load attendance report.");
    } finally {
      setLoadingReport(false);
    }
  }, [
    selectedCampus,
    selectedCampusData,
    reportType,
    reportCafe,
    reportMealSession,
    reportDate,
    reportStartDate,
    reportEndDate,
    reportMonth,
    reportYear,
  ]);

  const getReportPeriodLabel = (period) => {
    if (!period) return "";
    if (period.type === "daily") {
      return `Daily report for ${period.startDate}`;
    }
    if (period.type === "weekly") {
      return `Weekly report from ${period.startDate} to ${period.endDate}`;
    }
    if (period.type === "monthly") {
      const [year, month] = period.startDate.split("-");
      const monthName = new Date(`${year}-${month}-01`).toLocaleString([], {
        month: "long",
      });
      return `Monthly report for ${monthName} ${year}`;
    }
    return `${period.startDate} to ${period.endDate}`;
  };

  const handleExportReport = () => {
    if (!reportData) return;

    const cafeLabel = reportCafeLabel;

    const rows = [
      ["Campus", reportData.campusName || ""],
      ["Cafe", cafeLabel],
      ["Report Type", getReportTypeLabel(reportData.period?.type)],
      ["Meal Session", getMealLabel(reportMealSession)],
      ["Period Start", reportData.period?.startDate || ""],
      ["Period End", reportData.period?.endDate || ""],
      ["Total Regular", reportData.stats?.totalRegular ?? ""],
      ["Total Served", reportData.stats?.totalServed ?? ""],
      ["Total Unserved", reportData.stats?.totalUnserved ?? ""],
      [],
      ["Fasting Type", "Total", "Served", "Unserved"],
      ...Object.entries(reportData.stats?.breakdown || {}).map(
        ([fastingType, stats]) => [
          formatFastingTypeLabel(fastingType),
          stats.total,
          stats.served,
          stats.unserved,
        ],
      ),
    ];

    const safeCampusName = toSafeFilePart(reportData.campusName || "campus");
    const safeCafePart = toSafeFilePart(cafeLabel);
    const safeType = toSafeFilePart(reportData.period?.type || reportType);
    const safePeriod = toSafeFilePart(
      reportData.period?.startDate || reportDate,
    );
    downloadCsv(
      `${safeCampusName}-${safeCafePart}-${safeType}-${safePeriod}-attendance.csv`,
      rows,
    );
  };

  const reportLabel = getReportTypeLabel(reportType);

  return (
    <>
      <AdminNavbar />
      <div className="page-shell min-h-screen px-6 pb-12 pt-28 md:px-20 md:pt-36">
        <div className="mx-auto max-w-6xl">
          <div className="surface-card mb-4 rounded-[20px] py-4 px-6 shadow-sm border border-slate-200 bg-white/80">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-400/80">
                  Dashboard Meals
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-blue-700">
                  Attendance Reports
                </h1>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Generate daily, weekly, or monthly attendance snapshots for all
                students and export the results.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-card rounded-[28px] p-6 shadow-sm border border-slate-200 bg-white/80">
              <h2 className="text-xl font-bold">Filters</h2>
              <p className="mt-2 text-sm text-slate-500">
                Select the campus and report period to generate attendance
                snapshots.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
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
                          key={campus._id || campus.id}
                          value={campus._id || campus.id}
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

                <div className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Report Type
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { value: "daily", label: "Daily" },
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setReportType(option.value)}
                        className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold capitalize transition ${
                          reportType === option.value
                            ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {cafeOptions.length > 0 && (
                  <>
                    <div className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Meal Session
                      </span>
                      <div className="flex flex-nowrap gap-2 overflow-x-auto py-1">
                        {REPORT_MEAL_SESSIONS.map((session) => {
                          let displayDetail = session.detail;
                          if (
                            mealSchedule &&
                            session.value !== "total" &&
                            mealSchedule[session.value]
                          ) {
                            const schedule = mealSchedule[session.value];
                            displayDetail = `${schedule.start} - ${schedule.end}`;
                          }
                          return (
                            <button
                              key={session.value}
                              type="button"
                              onClick={() =>
                                setReportMealSession(session.value)
                              }
                              className={`min-w-[11rem] rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                                reportMealSession === session.value
                                  ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span>{session.label}</span>
                              <span className="mt-1 block text-xs font-medium text-slate-500">
                                {displayDetail}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Cafeteria
                      </span>
                      <select
                        value={reportCafe}
                        onChange={(e) => setReportCafe(e.target.value)}
                        className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      >
                        <option value="">All Cafes</option>
                        {cafeOptions.map((cafe) => (
                          <option
                            key={cafe.value}
                            value={cafe.value}
                            className="text-black"
                          >
                            {cafe.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {reportType === "daily" && (
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Date
                    </span>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                    />
                  </label>
                )}

                {reportType === "weekly" && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Start Date
                      </span>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        End Date
                      </span>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      />
                    </label>
                  </>
                )}

                {reportType === "monthly" && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Month
                      </span>
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      >
                        {[
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
                        ].map((monthOption) => (
                          <option
                            key={monthOption.value}
                            value={monthOption.value}
                          >
                            {monthOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Year
                      </span>
                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(e.target.value)}
                        className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      >
                        {[2025, 2026, 2027, 2028, 2029, 2030].map(
                          (yearOption) => (
                            <option key={yearOption} value={String(yearOption)}>
                              {yearOption}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </>
                )}
              </div>

              <button
                onClick={fetchReport}
                disabled={loadingReport || loadingCampuses || !selectedCampus}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingReport
                  ? "Loading report..."
                  : !selectedCampus
                    ? "No available campus"
                    : `Generate ${reportLabel} Attendance Snapshot`}
              </button>

              {(error || reportError) && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error || reportError}
                </div>
              )}
            </div>

            <div className="surface-panel rounded-[28px] p-6 shadow-sm border border-slate-100 bg-white/90">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                    Report Summary
                  </p>
                  {reportData && !reportSummaryNotice && (
                    <>
                      <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                        {reportCafeLabel}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {getReportPeriodLabel(reportData.period)}
                      </p>
                      {(() => {
                        const session = REPORT_MEAL_SESSIONS.find(
                          (s) => s.value === reportMealSession,
                        );
                        let detail = session?.detail;
                        const schedule =
                          reportData?.mealSchedule || mealSchedule || {};
                        const appliedWindow = reportData?.appliedMealWindow;

                        if (
                          reportMealSession &&
                          reportMealSession !== "total"
                        ) {
                          if (appliedWindow?.start && appliedWindow?.end) {
                            detail = `${appliedWindow.start} - ${appliedWindow.end}`;
                          } else if (schedule[reportMealSession]) {
                            detail = `${schedule[reportMealSession].start} - ${schedule[reportMealSession].end}`;
                          }
                        }

                        return (
                          <>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {session?.label ||
                                getMealLabel(reportMealSession)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {detail || "All Sessions"}
                            </p>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>

                {reportData && !reportSummaryNotice && (
                  <button
                    type="button"
                    onClick={handleExportReport}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Export Report
                  </button>
                )}
              </div>

              {reportData ? (
                reportSummaryNotice ? (
                  <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                    {reportSummaryNotice}
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4">
                    <div
                      className={`grid gap-3 mt-5 ${reportCafe ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}
                    >
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
                              {(
                                reportData.stats.totalInternships ??
                                reportData.stats.totalInternship ??
                                reportData.stats.internshipStudents ??
                                0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-3xl bg-white p-4 border border-slate-200">
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
                        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
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

                    <div className="flex-1">
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
                                {(
                                  reportData.stats.totalServed +
                                  reportData.stats.totalUnserved
                                ).toLocaleString()}
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

                    <div className="rounded-3xl bg-white p-4 border border-slate-200">
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
                  </div>
                )
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
          </div>
        </div>
      </div>
    </>
  );
}
