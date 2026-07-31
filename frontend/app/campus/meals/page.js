"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";
import { downloadCsv } from "@/app/utils/exportCsv";
import { getAppDayString } from "@/app/utils/appTimezone";

const url = process.env.NEXT_PUBLIC_API_URL;

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
  { value: "total", label: "Total", detail: "All Sessions" },
  { value: "breakfast", label: "Breakfast", detail: "10:23 - 10:50" },
  { value: "lunch", label: "Lunch", detail: "11:00 - 14:00" },
  { value: "dinner", label: "Dinner", detail: "17:00 - 20:00" },
];

const toSafeFilePart = (value, fallback = "data") =>
  String(value || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || fallback;

const getTodayString = () => new Date().toISOString().split("T")[0];

const getCafeNumberFromName = (name) => {
  const match = String(name || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

export default function CampusMealsPage() {
  const { currentCampus } = useCampus();
  const [cafes, setCafes] = useState([]);

  // Attendance Reports States
  const [reportType, setReportType] = useState("daily"); // 'daily', 'weekly', 'monthly'
  const [reportMealSession, setReportMealSession] = useState("total"); // 'total', 'breakfast', 'lunch', 'dinner'
  const [reportCafe, setReportCafe] = useState(""); // '' for All, or specific cafeNumber
  const [reportDate, setReportDate] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [mealSchedule, setMealSchedule] = useState(null);

  const cafeOptions = useMemo(() => {
    const seen = new Set();

    return cafes
      .map((cafe, index) => {
        const value =
          Number(cafe?.cafeNumber) ||
          getCafeNumberFromName(cafe?.name) ||
          index + 1;

        let label = cafe?.displayName?.trim() || cafe?.name?.trim();
        if (!label) {
          label = String(value);
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
        const res = await fetch("/api/campus/cafes", {
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
        const today = getTodayString();
        const params = new URLSearchParams();
        params.append("date", today);
        const url_with_params = `${url}/reports/daily?${params.toString()}`;

        const res = await fetch(url_with_params, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (data?.mealSchedule) {
          setMealSchedule(data.mealSchedule);
        }
      } catch (err) {
        console.error("Error fetching initial schedule:", err);
      }
    };
    fetchInitialSchedule();
  }, []);

  useEffect(() => {
    const today = getAppDayString();
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
    if (reportData) {
      setReportData(null);
    }
  }, [
    reportType,
    reportMealSession,
    reportCafe,
    reportDate,
    reportStartDate,
    reportEndDate,
    reportMonth,
    reportYear,
  ]);

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

      if (reportMealSession && reportMealSession !== "total") {
        params.append("mealType", reportMealSession);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to load report data");
      setReportData(data || null);
      // Extract and store meal schedule from response
      if (data?.mealSchedule) {
        setMealSchedule(data.mealSchedule);
      }
    } catch (err) {
      setReportError(err.message || "Could not load report data");
    } finally {
      setLoadingReport(false);
    }
  }, [
    reportType,
    reportMealSession,
    reportCafe,
    reportDate,
    reportStartDate,
    reportEndDate,
    reportYear,
    reportMonth,
  ]);

  const reportCafeOption = useMemo(
    () => cafeOptions.find((cafe) => cafe.value === reportCafe),
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
            <p className="font-bold">
              No historical data exists for the selected date.
            </p>
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

  const handleExportReportSummary = () => {
    if (!reportData) return;

    const rows = [
      [
        "Cafe",
        reportCafeLabel,
      ],
      ["Cafe Number", reportData.cafeNumber || "All"],
      ["Period Type", activeReportTypeLabel],
      [
        "Meal Session",
        REPORT_MEAL_SESSIONS.find((item) => item.value === reportMealSession)
          ?.label || "Total",
      ],
      ["Period Start", reportData.period?.startDate || ""],
      ["Period End", reportData.period?.endDate || ""],
      ["Total Students", (
        (Number(reportData.stats?.totalAssigned) || 0) +
        (Number(reportData.stats?.totalUnassigned) || 0) +
        (Number(
          reportData.stats?.totalInternships ??
          reportData.stats?.totalInternship ??
          reportData.stats?.internshipStudents ??
          0
        ))
      )],
      ["Total Assigned", reportData.stats?.totalAssigned ?? ""],
      ["Total Unassigned", reportData.stats?.totalUnassigned ?? ""],
      ["Total Internship", reportData.stats?.totalInternships ?? ""],
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

  const activeReportTypeLabel =
    REPORT_TYPES.find((item) => item.value === reportType)?.label || "Daily";

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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-blue-200/20 blur-3xl" />
          <div className="absolute right-0 top-28 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-200/10 blur-3xl" />
        </div>
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden gap-5">
          <div className="surface-panel relative overflow-hidden rounded-[20px] py-4 px-6 border border-slate-200/80 bg-white/80 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-400/80">
                  Campus Meals
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-blue-700">
                  Campus Attendance Reports
                </h1>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Build clear attendance reports for daily, weekly, or monthly periods with fasting breakdowns that are easy to scan.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] overflow-y-auto pr-1 pb-1">
            <div className="surface-card flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-(--app-text)">
                Report Filters
              </h2>
              <p className="mt-1 text-sm text-(--app-text-soft)">
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
                        onClick={() => {
                          setReportType(type);
                          setReportData(null);
                        }}
                        className={`flex-1 rounded-2xl border py-2.5 text-center text-sm font-semibold capitalize transition ${reportType === type
                            ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-white"
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Meal Session
                  </span>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 w-full py-1">
                    {REPORT_MEAL_SESSIONS.map((session) => {
                      let displayDetail = session.detail;
                      // Use real meal schedule times if available
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
                          onClick={() => {
                            setReportMealSession(session.value);
                            setReportData(null);
                          }}
                          className={`w-full rounded-xl border px-2 py-1.5 text-center transition ${reportMealSession === session.value
                              ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-white font-semibold"
                            }`}
                        >
                          <span className="block text-xs sm:text-sm">{session.label}</span>
                          <span className="mt-0.5 block text-[10px] sm:text-xs font-medium text-slate-500">
                            {displayDetail}
                          </span>
                        </button>
                      );
                    })}
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
                    <option value="">All Cafeterias</option>
                    {cafeOptions.filter(o => o.value !== "").map((cafe) => (
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
                        onChange={(e) => {
                          setReportYear(e.target.value);
                          setReportData(null);
                        }}
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
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
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
              {reportData && !reportSummaryNotice && (
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
                      {(() => {
                        const session = REPORT_MEAL_SESSIONS.find(
                          (item) => item.value === reportMealSession,
                        );
                        const schedule = reportData?.mealSchedule || {};
                        const appliedWindow = reportData?.appliedMealWindow;

                        let detail = session?.detail;
                        if (
                          reportMealSession &&
                          reportMealSession !== "total"
                        ) {
                          if (appliedWindow?.start && appliedWindow?.end) {
                            detail = `${appliedWindow.start} - ${appliedWindow.end}`;
                          } else {
                            detail =
                              schedule[reportMealSession]?.label ||
                              session?.detail;
                          }
                        }

                        return (
                          <>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">
                              {session?.label || "All Sessions"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {detail || "All Sessions"}
                            </p>
                          </>
                        );
                      })()}

                      <div className={`grid gap-3 mt-5 ${reportCafe ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
                        <div className="rounded-3xl bg-white border border-blue-100 p-4 text-left">
                          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                            Total Students
                          </p>
                          <p className="mt-1 text-2xl font-black text-blue-900">
                          {(
                            (Number(reportData.stats.totalAssigned) || 0) +
                            (Number(reportData.stats.totalUnassigned) || 0) +
                            (Number(
                              reportData.stats.totalInternships ??
                              reportData.stats.totalInternship ??
                              reportData.stats.internshipStudents ??
                              0
                            ))
                          ).toLocaleString()}
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
                          <div className="flex flex-col gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Total Report Summary
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Regular students, served students, and unserved
                                students totals.
                              </p>
                            </div>
                            <div className="grid gap-2 grid-cols-3 w-full">
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5 sm:p-4 text-center sm:text-left min-w-0">
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                  Total Students
                                </p>
                                <p className="mt-1 sm:mt-2 text-base sm:text-2xl font-black text-blue-900 break-all">
                                  {(
                                    reportData.stats.totalServed +
                                    reportData.stats.totalUnserved
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5 sm:p-4 text-center sm:text-left min-w-0">
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                  Total Served
                                </p>
                                <p className="mt-1 sm:mt-2 text-base sm:text-2xl font-black text-emerald-900 break-all">
                                  {reportData.stats.totalServed.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5 sm:p-4 text-center sm:text-left min-w-0">
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                  Total Unserved
                                </p>
                                <p className="mt-1 sm:mt-2 text-base sm:text-2xl font-black text-amber-900 break-all">
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
          </div>
        </div>
      </div>
    </>
  );
}
