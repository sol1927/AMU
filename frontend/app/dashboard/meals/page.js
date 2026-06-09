"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavbar from "@/app/components/AdminNavbar";
import { downloadCsv } from "@/app/utils/exportCsv";
import { getAppDayString } from "@/app/utils/appTimezone";

const url = process.env.NEXT_PUBLIC_API_URL;

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatFastingTypeLabel = (type) => {
  if (!type) return "Normal";
  if (type === "not_fasting") return "Normal";
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
  const [reportDate, setReportDate] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportData, setReportData] = useState(null);
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

  const cafeOptions = useMemo(() => {
    const cafes = selectedCampusData?.cafes || [];
    return cafes
      .map((cafe, index) => {
        const value = String(cafe.cafeNumber ?? cafe.id ?? index + 1);
        const label =
          cafe.displayName || cafe.name || `Cafe ${cafe.cafeNumber ?? value}`;
        return { value, label };
      })
      .filter((item) => item.value);
  }, [selectedCampusData]);

  const reportCafeLabel = useMemo(() => {
    if (reportData?.cafeName) {
      return reportData.cafeName;
    }

    const cafeNumber = reportData?.cafeNumber ?? reportCafe;
    if (cafeNumber) {
      const match = cafeOptions.find(
        (item) => item.value === String(cafeNumber),
      );
      return match?.label || `Cafe ${cafeNumber}`;
    }

    return "All Cafes";
  }, [reportData, reportCafe, cafeOptions]);

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
    } catch (err) {
      setReportError(err.message || "Failed to load attendance report.");
    } finally {
      setLoadingReport(false);
    }
  }, [
    selectedCampus,
    reportType,
    reportCafe,
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
      <div className="page-shell min-h-screen px-6 pb-12 pt-20 md:px-20 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <div className="surface-card mb-8 rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200 bg-white/80">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-400/80">
              Dashboard Meals
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl text-blue-700">
              Attendance Reports
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
              Generate daily, weekly, or monthly attendance snapshots for all
              students and export the results.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReportType(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                    reportType === option.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
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

                {cafeOptions.length > 0 && (
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Cafe (optional)
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
                  <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                    {reportData ? reportCafeLabel : "No report loaded"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {reportData
                      ? getReportPeriodLabel(reportData.period)
                      : "Choose a report type and generate to view campus attendance stats."}
                  </p>
                </div>

                {reportData && (
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
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Total Regular
                      </p>
                      <p className="mt-3 text-4xl font-black text-slate-900">
                        {reportData.stats?.totalRegular?.toLocaleString() ?? 0}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 ring-1 ring-emerald-200">
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                        Served
                      </p>
                      <p className="mt-3 text-4xl font-black text-emerald-900">
                        {reportData.stats?.totalServed?.toLocaleString() ?? 0}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 ring-1 ring-amber-200">
                      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                        Unserved
                      </p>
                      <p className="mt-3 text-4xl font-black text-amber-900">
                        {reportData.stats?.totalUnserved?.toLocaleString() ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Served Progress
                        </p>
                        <p className="text-sm text-slate-500">
                          Percentage of regular students who were served.
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {reportData.stats?.totalRegular > 0
                          ? `${(
                              (reportData.stats.totalServed /
                                reportData.stats.totalRegular) *
                              100
                            ).toFixed(1)}% served`
                          : "No regular students"}
                      </p>
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-white shadow-sm">
                      <div
                        style={{
                          width: `${
                            reportData.stats?.totalRegular > 0
                              ? (reportData.stats.totalServed /
                                  reportData.stats.totalRegular) *
                                100
                              : 0
                          }%`,
                        }}
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-500"
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Attendance Breakdown by Fasting Type
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-slate-600">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 font-semibold text-slate-900">
                              Fasting Type
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-900 text-right">
                              Total
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-900 text-right">
                              Served
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-900 text-right">
                              Unserved
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {Object.entries(
                            reportData.stats?.breakdown || {},
                          ).map(([key, stats]) => (
                            <tr key={key} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {formatFastingTypeLabel(key)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {stats.total?.toLocaleString() ?? 0}
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-700">
                                {stats.served?.toLocaleString() ?? 0}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-700">
                                {stats.unserved?.toLocaleString() ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  Select a campus and a report period, then click the button to
                  load attendance snapshots for the campus.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
