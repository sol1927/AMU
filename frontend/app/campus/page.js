"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCampus } from "@/app/context/CampusContext";
import CampusNavbar from "@/app/components/CampusNavbar";
import { downloadCsv } from "@/app/utils/exportCsv";
import { getAppDayString } from "@/app/utils/appTimezone";
import {
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineSwitchHorizontal,
  HiOutlineUserCircle,
  HiOutlineArrowLeft,
} from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;
const LIVE_CAFE_WINDOW_MS = 5 * 60 * 1000;

const getInitialDashboardSession = () => {
  const breakfastLabel = "\u1241\u122d\u1235";
  const lunchLabel = "\u121d\u1233";
  const dinnerLabel = "\u12a5\u122b\u1275";
  const current = new Date();
  const currentMinutes = current.getHours() * 60 + current.getMinutes();

  if (currentMinutes >= 17 * 60) {
    return { mealType: "dinner", mealLabel: dinnerLabel };
  }

  if (currentMinutes >= 14 * 60) {
    return { mealType: "dinner", mealLabel: dinnerLabel };
  }

  if (currentMinutes >= 11 * 60) {
    return { mealType: "lunch", mealLabel: lunchLabel };
  }

  if (currentMinutes >= 9 * 60) {
    return { mealType: "lunch", mealLabel: lunchLabel };
  }

  if (currentMinutes >= 6 * 60) {
    return { mealType: "breakfast", mealLabel: breakfastLabel };
  }

  return { mealType: "breakfast", mealLabel: breakfastLabel };
};

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/(^|[\s-])\S/g, (match) => match.toUpperCase());
};

const getCafeDisplayName = (cafe) => {
  if (!cafe) return "";
  if (cafe.displayName) return cafe.displayName;
  return cafe.name
    ? cafe.name.charAt(0).toUpperCase() + cafe.name.slice(1)
    : "";
};

export default function CampusDashboardPage() {
  const router = useRouter();
  const { currentCampus, loading, selectCafeNumber } = useCampus();

  // Live Cafes section logic
  const [cafesList, setCafesList] = useState([]);
  // Removed cafe selection modal logic
  const [detailMode, setDetailMode] = useState("regular");
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState("");
  const [reportType, setReportType] = useState("daily");
  const [reportCafe, setReportCafe] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const initialSession = getInitialDashboardSession();

  const [stats, setStats] = useState({
    ...initialSession,
    totalStudents: 0,
    regularStudents: 0,
    internshipStudents: 0,
    servedStudents: 0,
    pendingStudents: 0,
    fastingBreakdown: {
      fasting: 0,
      sundayFasting: 0,
      muslimFasting: 0,
      notFasting: 0,
    },
    regularFastingBreakdown: {
      fasting: 0,
      sundayFasting: 0,
      muslimFasting: 0,
      notFasting: 0,
    },
    internshipFastingBreakdown: {
      fasting: 0,
      sundayFasting: 0,
      muslimFasting: 0,
      notFasting: 0,
    },
    servedFastingBreakdown: {
      fasting: 0,
      sundayFasting: 0,
      muslimFasting: 0,
      notFasting: 0,
    },
    pendingFastingBreakdown: {
      fasting: 0,
      sundayFasting: 0,
      muslimFasting: 0,
      notFasting: 0,
    },
    recentScans: [],
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [toast, setToast] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchLiveCafes = useCallback(async () => {
    try {
      const res = await fetch(`${url}/campus/cafes`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCafesList(data.cafes || []);
      }
    } catch (err) {
      console.error("Failed to fetch live cafes:", err);
    }
  }, []);

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
    if (!reportCafe && selectedCafe) {
      setReportCafe(selectedCafe === "all" ? "" : selectedCafe);
    }
  }, [selectedCafe, reportCafe]);

  useEffect(() => {
    if (!currentCampus || currentCampus.selectedCafeNumber) return;

    const firstCafe = currentCampus.cafeNumbers?.[0];
    if (!firstCafe) return;

    selectCafeNumber(firstCafe).catch((err) => {
      console.error("Failed to auto-select cafe number:", err);
    });
  }, [currentCampus, selectCafeNumber]);

  const isCafeOnline = (cafe) => {
    if (!cafe.isOnline || !cafe.lastActiveAt) return false;
    const lastActive = new Date(cafe.lastActiveAt);
    const now = new Date();
    return now.getTime() - lastActive.getTime() <= LIVE_CAFE_WINDOW_MS;
  };

  const fetchDashboardStats = useCallback(
    async (manual = false, targetCafe = selectedCafe, showLoading = false) => {
      if (manual) {
        setIsRefreshing(true);
        fetchLiveCafes();
      }
      if (showLoading) {
        setLoadingStats(true);
      }

      try {
        let endpoint = `${url}/meal/dashboard`;
        if (targetCafe === "all") {
          endpoint = `${url}/meal/dashboard?all=true`;
        } else if (targetCafe) {
          endpoint = `${url}/meal/dashboard?cafeNumber=${targetCafe}`;
        }

        const res = await fetch(endpoint, {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to fetch dashboard stats");

        const data = await res.json();
        const total = Number(data.totalStudents) || 0;
        const served = Number(data.servedStudents) || 0;

        setStats({
          mealType: data.mealType || "breakfast",
          mealLabel: data.mealLabel || "ቁርስ",
          totalStudents: total,
          regularStudents: Number(data.regularStudents) || 0,
          internshipStudents: Number(data.internshipStudents) || 0,
          servedStudents: served,
          pendingStudents: Number(data.pendingStudents) || 0,
          fastingBreakdown: data.fastingBreakdown || {
            fasting: 0,
            sundayFasting: 0,
            muslimFasting: 0,
            notFasting: 0,
          },
          regularFastingBreakdown: data.regularFastingBreakdown || {
            fasting: 0,
            sundayFasting: 0,
            muslimFasting: 0,
            notFasting: 0,
          },
          internshipFastingBreakdown: data.internshipFastingBreakdown || {
            fasting: 0,
            sundayFasting: 0,
            muslimFasting: 0,
            notFasting: 0,
          },
          servedFastingBreakdown: data.servedFastingBreakdown || {
            fasting: 0,
            sundayFasting: 0,
            muslimFasting: 0,
            notFasting: 0,
          },
          pendingFastingBreakdown: data.pendingFastingBreakdown || {
            fasting: 0,
            sundayFasting: 0,
            muslimFasting: 0,
            notFasting: 0,
          },
          recentScans: data.recentScans || [],
        });

        if (manual) showToast("Stats updated", "success");
      } catch {
        showToast("Failed to load dashboard");
      } finally {
        setIsRefreshing(false);
        setLoadingStats(false);
      }
    },
    [fetchLiveCafes, selectedCafe],
  );

  const cafeOptions = useMemo(
    () => [
      { value: "", label: "All Cafes" },
      ...cafesList.map((cafe, idx) => {
        const value = String(cafe.cafeNumber || idx + 1);
        const label = cafe.displayName?.trim() || String(value);
        return { value, label };
      }),
    ],
    [cafesList],
  );

  const reportCafeOption = useMemo(
    () => cafeOptions.find((cafe) => cafe.value === reportCafe),
    [cafeOptions, reportCafe],
  );

  const activeReportTypeLabel =
    reportType === "weekly"
      ? "Weekly"
      : reportType === "monthly"
        ? "Monthly"
        : "Daily";

  const safeFilePart = (value, fallback = "data") =>
    String(value || fallback)
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase();

  const fetchReport = async () => {
    setReportError("");
    setReportData(null);
    setLoadingReport(true);

    try {
      const params = new URLSearchParams();
      if (reportCafe) params.append("cafeNumber", reportCafe);
      if (reportType === "daily") {
        params.append("date", reportDate);
      } else if (reportType === "weekly") {
        params.append("startDate", reportStartDate);
        params.append("endDate", reportEndDate);
      } else if (reportType === "monthly") {
        params.append("year", reportYear);
        params.append("month", reportMonth);
      }

      const res = await fetch(
        `${url}/reports/${reportType}?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to generate report");
      }

      const data = await res.json();
      setReportData(data);
    } catch (err) {
      setReportError(err?.message || "Unable to generate report.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportReportSummary = () => {
    if (!reportData) return;

    const cafeLabel = reportCafeOption?.label || "All Cafes";
    const rows = [
      ["Cafe", cafeLabel],
      ["Period Type", activeReportTypeLabel],
      ["Period Start", reportData.period?.startDate || ""],
      ["Period End", reportData.period?.endDate || ""],
      ["Total Regular", reportData.stats?.totalRegular ?? ""],
      ["Total Served", reportData.stats?.totalServed ?? ""],
      ["Total Unserved", reportData.stats?.totalUnserved ?? ""],
    ];

    Object.entries(reportData.stats?.breakdown || {}).forEach(
      ([key, values]) => {
        rows.push([`${key} Total`, values.total ?? ""]);
        rows.push([`${key} Served`, values.served ?? ""]);
        rows.push([`${key} Unserved`, values.unserved ?? ""]);
      },
    );

    const safeCafe = safeFilePart(cafeLabel, "cafes");
    const safePeriod = safeFilePart(
      reportData.period?.startDate || reportData.period?.endDate || "period",
    );
    downloadCsv(
      `${safeCafe}-${safePeriod}-${activeReportTypeLabel.toLowerCase()}-report.csv`,
      rows,
    );
  };

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch(`${url}/approvals`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setApprovals(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    }
  }, []);

  const getSelectedCafeLabel = () => {
    if (selectedCafe === "all") return "All Cafes (Combined Snapshot)";
    if (!currentCampus?.selectedCafeNumber) return "";
    const selectedCafeObj = cafesList.find((c, idx) => {
      const num = c.cafeNumber || idx + 1;
      return num === currentCampus.selectedCafeNumber;
    });
    return selectedCafeObj
      ? getCafeDisplayName(selectedCafeObj)
      : `Cafe ${currentCampus.selectedCafeNumber}`;
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${url}/approvals/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        fetchApprovals();
        fetchDashboardStats(true);
        showToast("Approvals approved!", "success");
      } else {
        showToast("Failed to approve");
      }
    } catch (err) {
      console.error("Failed to approve:", err);
      showToast("Error processing approval");
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`${url}/approvals/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        fetchApprovals();
        showToast("Approval rejected", "success");
      } else {
        showToast("Failed to reject");
      }
    } catch (err) {
      console.error("Failed to reject:", err);
      showToast("Error processing rejection");
    }
  };

  useEffect(() => {
    if (currentCampus?.selectedCafeNumber && selectedCafe !== "all") {
      setSelectedCafe(String(currentCampus.selectedCafeNumber));
    }
  }, [currentCampus?.selectedCafeNumber]);

  useEffect(() => {
    if (selectedCafe) {
      fetchDashboardStats(false, selectedCafe, true);
    }
    fetchApprovals();
    fetchLiveCafes();
  }, [selectedCafe, fetchDashboardStats, fetchApprovals, fetchLiveCafes]);

  useEffect(() => {
    if (!currentCampus) return undefined;

    const intervalId = setInterval(() => {
      fetchDashboardStats(false);
      fetchLiveCafes();
      fetchApprovals();
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardStats(false);
        fetchLiveCafes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentCampus, fetchDashboardStats, fetchLiveCafes]);

  useEffect(() => {
    setShowSecurityWarning(!!currentCampus?.mustChangePassword);
  }, [currentCampus]);

  useEffect(() => {
    const handleOffline = () => showToast("You are offline");
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  useEffect(() => {
    if (!loading && !currentCampus) {
      router.replace("/");
    }
  }, [currentCampus, loading, router]);

  const getBreakdownTitle = () => {
    switch (detailMode) {
      case "internship":
        return `Internship Students by Fasting Type (${stats.mealLabel})`;
      case "served":
        return `Served Students by Fasting Type (${stats.mealLabel})`;
      case "pending":
        return `Pending Students by Fasting Type (${stats.mealLabel})`;
      case "total":
        return `Total Students by Fasting Type (${stats.mealLabel})`;
      case "regular":
      default:
        return `Regular Students by Fasting Type (${stats.mealLabel})`;
    }
  };

  const getActiveBreakdown = () => {
    switch (detailMode) {
      case "internship":
        return stats.internshipFastingBreakdown;
      case "served":
        return stats.servedFastingBreakdown;
      case "pending":
        return stats.pendingFastingBreakdown;
      case "total":
        return stats.fastingBreakdown;
      case "regular":
      default:
        return stats.regularFastingBreakdown;
    }
  };

  const activeBreakdown = getActiveBreakdown();

  if (loading) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200"></div>
          <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!currentCampus) {
    return null;
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell min-h-screen px-6 pb-12 pt-28 md:px-20 md:pt-36">
        <section className="mb-12 relative mx-auto max-w-5xl">
          {/* Sleek Auto-refreshing Live Cafes at Top Right */}
          <div className="absolute top-0 right-0 hidden lg:flex flex-col items-end gap-2 text-xs animate-fadeIn">
            <span className="flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-wider">
              {cafesList.filter(isCafeOnline).length > 0 ? (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Stations:
                </>
              ) : (
                <>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
                  Live Stations:
                </>
              )}
            </span>
            <div className="flex flex-col gap-1.5 items-end">
              {cafesList.filter(isCafeOnline).length > 0 ? (
                cafesList.filter(isCafeOnline).map((cafe) => {
                  const displayName = getCafeDisplayName(cafe);
                  const truncatedName =
                    displayName.length > 20
                      ? displayName.slice(0, 17) + "..."
                      : displayName;
                  return (
                    <span
                      key={cafe.id}
                      title={displayName}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-2xl border border-emerald-200 shadow-sm animate-fadeIn cursor-default"
                    >
                      {truncatedName}
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center bg-rose-50 text-rose-600 font-bold px-3 py-1.5 rounded-2xl border border-rose-200 shadow-sm animate-fadeIn animate-pulse">
                  No Live Cafe
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-500/80 font-bold">
                Campus Admin
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-blue-700 sm:text-5xl">
                Welcome, {capitalizeWords(currentCampus?.name || "Campus")}
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Manage cafeteria terminals, scanning schedules, and student directory cohorts.
              </p>
            </div>
          </div>

          {/* Mobile responsive view of live cafes */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 items-center text-xs lg:hidden animate-fadeIn">
            {cafesList.filter(isCafeOnline).length > 0 ? (
              <>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  Live Stations:
                </span>
                {cafesList.filter(isCafeOnline).map((cafe) => {
                  const displayName = getCafeDisplayName(cafe);
                  const truncatedName =
                    displayName.length > 20
                      ? displayName.slice(0, 17) + "..."
                      : displayName;
                  return (
                    <span
                      key={cafe.id}
                      title={displayName}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm cursor-default"
                    >
                      {truncatedName}
                    </span>
                  );
                })}
              </>
            ) : (
              <>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  Live Stations:
                </span>
                <span className="inline-flex items-center bg-rose-50 text-rose-600 font-bold px-2.5 py-1 rounded-full border border-rose-200 shadow-sm animate-pulse">
                  No Live Cafe
                </span>
              </>
            )}
          </div>
        </section>

        {!showSnapshot ? (
          <>
            {/* Simple Dashboard Overview & Navigation Grid */}
            <div className="mx-auto max-w-5xl space-y-8 animate-fadeIn">
              {/* Hero welcome card */}
              <div className="surface-card rounded-3xl p-8 md:p-10 relative overflow-hidden">
                {/* Background radial accent */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>

                <div className="relative z-10 grid gap-8 md:grid-cols-[1.5fr_1fr] items-center">
                  <div className="text-left">
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-4 border border-blue-200">
                      🏫 Portal Home
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                      Institution Administration Panel
                    </h2>
                    <p className="mt-3 text-slate-500 text-sm md:text-base leading-relaxed max-w-lg">
                      Welcome to the GibiGebeta meal management dashboard.
                      Monitor scanner terminals, sync student databases, manage
                      active scanning hours, and authorize cafeteria accounts.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        onClick={() => fetchDashboardStats(true)}
                        disabled={isRefreshing}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold transition border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 duration-200 ${
                          isRefreshing
                            ? "cursor-not-allowed text-slate-400"
                            : "text-slate-700"
                        }`}
                      >
                        {isRefreshing ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                        ) : (
                          "🔄"
                        )}
                        {isRefreshing ? "Refreshing..." : "Refresh Stats"}
                      </button>
                    </div>
                  </div>

                  {/* Summary Quick Stats in Hero */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Total Students
                      </span>
                      <span className="mt-1 block text-3xl font-black text-blue-600">
                        {stats.totalStudents}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Cafes
                      </span>
                      <span className="mt-1 block text-3xl font-black text-fuchsia-600">
                        {cafesList.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Quick Actions Grid */}
              <div>
                <h3 className="mb-4 text-xs uppercase font-extrabold tracking-widest text-slate-400">
                  Administrative Utilities
                </h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Student Directory */}
                  <button
                    onClick={() => router.push("/campus/students")}
                    className="surface-card rounded-3xl p-6 text-left hover:shadow-lg transition duration-300 group flex flex-col justify-between min-h-48"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <HiOutlineUserGroup className="h-6 w-6" />
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Student Directory
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                        Manage enrolled students, sync from external registrar
                        databases, and specify dietary settings.
                      </p>
                    </div>
                  </button>

                  {/* Meal Schedules */}
                  <button
                    onClick={() => router.push("/campus/time-controller")}
                    className="surface-card rounded-3xl p-6 text-left hover:shadow-lg transition duration-300 group flex flex-col justify-between min-h-48"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      <HiOutlineClock className="h-6 w-6" />
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Time Controller
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                        Establish active scanning time slots for breakfast,
                        lunch, and dinner scan validation.
                      </p>
                    </div>
                  </button>

                  {/* Cafe Management */}
                  <button
                    onClick={() => router.push("/campus/cafes")}
                    className="surface-card rounded-3xl p-6 text-left hover:shadow-lg transition duration-300 group flex flex-col justify-between min-h-48"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                      <HiOutlineSwitchHorizontal className="h-6 w-6" />
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        Campus Cafes
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                        Add, review, and authorize cafe operator accounts,
                        monitoring active stations.
                      </p>
                    </div>
                  </button>

                  {/* Campus Profile */}
                  <button
                    onClick={() => router.push("/campus/profile")}
                    className="surface-card rounded-3xl p-6 text-left hover:shadow-lg transition duration-300 group flex flex-col justify-between min-h-48"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                      <HiOutlineUserCircle className="h-6 w-6" />
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        Institution Profile
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                        Update logo graphics, modify password credentials, and
                        customize campus details.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Pending Cafeteria Approvals (only shown if there are any) */}
            {approvals.length > 0 && (
              <section className="mx-auto mt-12 max-w-5xl surface-panel rounded-[30px] p-6 border border-amber-500/25 bg-amber-500/5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-amber-600 font-bold">
                    Verification Queue
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    Pending Cafeteria Approvals
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cafeteria operators have requested updates to their
                    accounts. Review and approve their changes.
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {approvals.map((req) => (
                    <div
                      key={req.id}
                      className="surface-card rounded-3xl p-5 border border-slate-200 bg-white shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-amber-100 text-sm font-bold text-amber-700">
                              {req.pendingData?.logo?.url ? (
                                <img
                                  src={req.pendingData.logo.url}
                                  alt="New logo"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                req.requesterName?.charAt(0) || "C"
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">
                                {req.requesterName}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {req.requesterEmail}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                            Cafe Account
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-700">
                          {req.pendingData?.name && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                                Name:
                              </span>
                              <span className="flex-1 text-right break-words text-slate-800 font-medium">
                                {req.pendingData.name}
                              </span>
                            </div>
                          )}
                          {req.pendingData?.email && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                                Email:
                              </span>
                              <span className="flex-1 text-right break-words text-slate-800 font-medium">
                                {req.pendingData.email}
                              </span>
                            </div>
                          )}
                          {req.pendingData?.password && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                                Password:
                              </span>
                              <span className="flex-1 text-right text-amber-600 font-medium">
                                ••••• (Security Password Reset Request)
                              </span>
                            </div>
                          )}
                          {req.pendingData?.logo && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                                Photo Update:
                              </span>
                              <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                New Photo Attached
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleReject(req.id)}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-1.5 rounded-xl text-xs font-bold transition-all border border-rose-200/50"
                        >
                          Reject Changes
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                        >
                          Approve Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Snapshot View Mode */
          <div className="mx-auto max-w-5xl animate-fadeIn space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <button
                onClick={() => setShowSnapshot(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition active:scale-95 duration-155"
              >
                <HiOutlineArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </button>

              <div className="text-right flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Meal Session:
                </span>
                <span className="inline-flex items-center bg-blue-50 text-blue-700 font-extrabold px-3 py-1 rounded-full border border-blue-200 shadow-sm text-sm">
                  {stats.mealLabel} ({stats.mealType})
                </span>
              </div>
            </div>

            {/* Select Cafe Section */}
            <section className="mx-auto max-w-2xl">
              <div className="surface-card rounded-3xl p-8 flex flex-col items-center">
                <label
                  htmlFor="cafe-select"
                  className="mb-2 text-sm font-semibold text-slate-700"
                >
                  Select Cafe Number to View Snapshot:
                </label>
                <select
                  id="cafe-select"
                  className="mb-4 rounded-xl border px-4 py-2 text-base bg-white text-slate-800 w-44 truncate"
                  value={selectedCafe}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setSelectedCafe(val);
                    if (val !== "all") {
                      try {
                        await selectCafeNumber(Number(val));
                      } catch (err) {
                        showToast(err?.message || "Failed to switch cafe.");
                      }
                    }
                  }}
                >
                  <option value="" disabled>
                    Select a cafe
                  </option>
                  <option value="all">All Cafes</option>
                  {cafesList.map((c, index) => {
                    const num = c.cafeNumber || index + 1;
                    const displayName = getCafeDisplayName(c);
                    const truncatedName =
                      displayName.length > 20
                        ? displayName.slice(0, 17) + "..."
                        : displayName;
                    return (
                      <option
                        key={c.id || c._id}
                        value={num}
                        title={displayName}
                      >
                        {truncatedName}
                      </option>
                    );
                  })}
                </select>

                {selectedCafe && (
                  <div
                    className={`w-full mt-4 transition-opacity duration-200 ${loadingStats ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                  >
                    <h4
                      title={getSelectedCafeLabel()}
                      className="text-lg font-bold mb-2 text-blue-600 text-center truncate max-w-full px-4"
                    >
                      Snapshot for{" "}
                      {(() => {
                        const label = getSelectedCafeLabel();
                        return label.length > 20
                          ? label.slice(0, 17) + "..."
                          : label;
                      })()}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-blue-50 p-4 text-center">
                        <div className="text-xs text-blue-700 font-semibold">
                          Regular
                        </div>
                        <div className="text-2xl font-bold">
                          {stats.regularStudents}
                        </div>
                      </div>
                      <div className="rounded-xl bg-fuchsia-50 p-4 text-center">
                        <div className="text-xs text-fuchsia-700 font-semibold">
                          Internship
                        </div>
                        <div className="text-2xl font-bold">
                          {stats.internshipStudents}
                        </div>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-4 text-center">
                        <div className="text-xs text-emerald-700 font-semibold">
                          Served
                        </div>
                        <div className="text-2xl font-bold">
                          {stats.servedStudents}
                        </div>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-4 text-center">
                        <div className="text-xs text-amber-700 font-semibold">
                          Pending
                        </div>
                        <div className="text-2xl font-bold">
                          {stats.pendingStudents}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="surface-card flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Attendance Reports
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Generate a daily, weekly, or monthly attendance report for the
                  selected cafeteria.
                </p>

                <div className="mt-4 grid gap-4">
                  <div>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Report Type
                    </span>
                    <div className="flex gap-2">
                      {[
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setReportType(type.value)}
                          className={`flex-1 rounded-2xl border py-2.5 text-center text-sm font-semibold capitalize transition ${
                            reportType === type.value
                              ? "border-blue-300 bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Cafeteria
                    </span>
                    <select
                      value={reportCafe}
                      onChange={(e) => setReportCafe(e.target.value)}
                      className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900"
                    >
                      {cafeOptions.map((cafe) => (
                        <option key={cafe.value} value={cafe.value}>
                          {cafe.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {reportType === "daily" && (
                    <label className="block animate-fadeIn">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Date
                      </span>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900"
                      />
                    </label>
                  )}

                  {reportType === "weekly" && (
                    <div className="grid gap-3 sm:grid-cols-2 animate-fadeIn">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Start Date
                        </span>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900"
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
                          className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900"
                        />
                      </label>
                    </div>
                  )}

                  {reportType === "monthly" && (
                    <div className="grid gap-3 sm:grid-cols-2 animate-fadeIn">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Month
                        </span>
                        <select
                          value={reportMonth}
                          onChange={(e) => setReportMonth(e.target.value)}
                          className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900"
                        >
                          {Array.from({ length: 12 }, (_, index) => ({
                            value: String(index + 1),
                            label: new Date(0, index).toLocaleString("en-US", {
                              month: "long",
                            }),
                          })).map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
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
                          className="field-surface w-full rounded-2xl px-4 py-2.5 outline-none transition focus:border-blue-500 text-slate-900"
                        >
                          {Array.from({ length: 6 }, (_, index) => {
                            const year = new Date().getFullYear() + index;
                            return (
                              <option key={year} value={String(year)}>
                                {year}
                              </option>
                            );
                          })}
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
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 animate-fadeIn">
                    {reportError}
                  </div>
                )}
              </div>

              <div className="surface-panel flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-500/80">
                  Report Summary
                </p>
                {reportData && (
                  <button
                    type="button"
                    onClick={handleExportReportSummary}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Export Summary
                  </button>
                )}

                {reportData ? (
                  <div className="mt-4 flex flex-col h-full">
                    <h2 className="text-2xl font-black leading-tight text-slate-900 md:text-3xl">
                      {reportCafeOption?.label || "All Cafes"}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
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
                          Total Served
                        </p>
                        <p className="mt-1 text-2xl font-black text-emerald-900">
                          {reportData.stats.totalServed.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-white border border-amber-100 p-4 text-left">
                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                          Total Unserved
                        </p>
                        <p className="mt-1 text-2xl font-black text-amber-900">
                          {reportData.stats.totalUnserved.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {Object.entries(reportData.stats.breakdown || {}).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-slate-800 capitalize">
                                {key.replace(/_/g, " ")}
                              </p>
                              <p className="text-sm font-semibold text-slate-600">
                                {value.total ?? 0} total
                              </p>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                                Served
                                <div className="mt-2 text-lg font-black text-emerald-700">
                                  {value.served ?? 0}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                                Unserved
                                <div className="mt-2 text-lg font-black text-amber-700">
                                  {value.unserved ?? 0}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                                Rate
                                <div className="mt-2 text-lg font-black text-blue-700">
                                  {value.total
                                    ? `${Math.round(((value.served || 0) / value.total) * 100)}%`
                                    : "0%"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Generate an attendance report to preview totals and fasting
                    breakdown.
                  </p>
                )}
              </div>
            </section>

            {/* Interactive Student Snapshot grid & Fasting Breakdown */}
            <section
              className={`grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr] transition-opacity duration-200 ${loadingStats ? "opacity-40 pointer-events-none" : "opacity-100"}`}
            >
              <div className="surface-panel rounded-3xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Student Snapshot
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      A quick view of regular, internship, served, and pending
                      students for {stats.mealLabel}.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDetailMode("regular")}
                    className={`rounded-3xl p-5 text-left ring-1 transition ${
                      detailMode === "regular"
                        ? "bg-sky-50 ring-sky-300/50"
                        : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-sm text-slate-600">Regular Students</p>
                    <p className="mt-2 text-3xl font-black text-sky-700">
                      {stats.regularStudents}
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
                        : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-sm text-slate-600">
                      Internship Students
                    </p>
                    <p className="mt-2 text-3xl font-black text-fuchsia-700">
                      {stats.internshipStudents}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                      Click to view fasting breakdown
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailMode("served")}
                    className={`rounded-3xl p-5 text-left ring-1 transition ${
                      detailMode === "served"
                        ? "bg-emerald-50 ring-emerald-300/50"
                        : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-sm text-slate-600">Served Today</p>
                    <p className="text-xs text-slate-400">{stats.mealLabel}</p>
                    <p className="mt-2 text-3xl font-black text-emerald-700">
                      {stats.servedStudents}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Click to view fasting breakdown
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailMode("pending")}
                    className={`rounded-3xl p-5 text-left ring-1 transition ${
                      detailMode === "pending"
                        ? "bg-amber-50 ring-amber-300/50"
                        : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-sm text-slate-600">Pending</p>
                    <p className="text-xs text-slate-400">{stats.mealLabel}</p>
                    <p className="mt-2 text-3xl font-black text-amber-700">
                      {stats.pendingStudents}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Click to view fasting breakdown
                    </p>
                  </button>
                </div>
              </div>

              <div className="surface-panel rounded-3xl p-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Fasting Breakdown
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getBreakdownTitle()}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Fasting
                    </p>
                    <p className="mt-2 text-2xl font-black text-amber-800">
                      {activeBreakdown.fasting}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                      Sunday Fasting
                    </p>
                    <p className="mt-2 text-2xl font-black text-violet-800">
                      {activeBreakdown.sundayFasting}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Muslim Fasting
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-800">
                      {activeBreakdown.muslimFasting}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Not Fasting
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {activeBreakdown.notFasting}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`app-toast fixed bottom-6 right-6 rounded-xl px-4 py-2 transition z-50 ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {showSecurityWarning && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md animate-fadeIn rounded-3xl border border-amber-200 bg-amber-50/95 p-6 shadow-2xl backdrop-blur-md dark:border-amber-900/30 dark:bg-amber-950/95 text-slate-800 dark:text-slate-100">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl text-amber-600 dark:text-amber-400">
              ⚠️
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Change Default Credentials
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                For maximum security, please change your default campus
                credentials (email and password).
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => router.push("/campus/profile")}
                  className="rounded-2xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-sm font-bold text-white transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  Change Now
                </button>
                <button
                  onClick={() => setShowSecurityWarning(false)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CafeNumberModal removed: direct dashboard, no cafe selection modal */}
    </>
  );
}
