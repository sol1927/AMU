"use client";
import { useRouter } from "next/navigation";
import { useCampus } from "@/app/context/CampusContext";
import { useState, useEffect, useCallback } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import CafeNumberModal from "@/app/components/CafeNumberModal";
import {
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineSwitchHorizontal,
  HiOutlineUserCircle,
  HiOutlineArrowLeft,
  HiOutlineTrendingUp,
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

export default function CampusDashboardPage() {
  const router = useRouter();
  const { currentCampus, loading, selectCafeNumber } = useCampus();

  // Live Cafes section logic
  const [cafesList, setCafesList] = useState([]);
  const [loadingCafes, setLoadingCafes] = useState(false);
  // Removed cafe selection modal logic
  const [detailMode, setDetailMode] = useState("regular");
  const [showSnapshot, setShowSnapshot] = useState(false);
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
  const [toast, setToast] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchLiveCafes = useCallback(async () => {
    setLoadingCafes(true);
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
    } finally {
      setLoadingCafes(false);
    }
  }, []);

  const isCafeOnline = (cafe) => {
    if (!cafe.isOnline || !cafe.lastActiveAt) return false;
    const lastActive = new Date(cafe.lastActiveAt);
    const now = new Date();
    return now.getTime() - lastActive.getTime() <= LIVE_CAFE_WINDOW_MS;
  };

  const fetchDashboardStats = useCallback(
    async (manual = false) => {
      if (!currentCampus?.selectedCafeNumber) return;
      if (manual) {
        setIsRefreshing(true);
        fetchLiveCafes();
      }

      try {
        const res = await fetch(`${url}/meal/dashboard`, {
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
      }
    },
    [currentCampus],
  );

  const fetchApprovals = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const res = await fetch(`${url}/approvals`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setApprovals(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setLoadingApprovals(false);
    }
  }, []);

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
    fetchDashboardStats();
    fetchApprovals();
    fetchLiveCafes();
  }, [fetchDashboardStats, fetchApprovals, fetchLiveCafes]);

  useEffect(() => {
    if (!currentCampus) return undefined;

    const intervalId = setInterval(() => {
      fetchDashboardStats(false);
      fetchLiveCafes();
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
    if (currentCampus?.mustChangePassword) {
      setShowSecurityWarning(true);
    }
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
      <div className="page-shell min-h-screen px-6 pb-12 pt-20 md:px-20 md:pt-28">
        <section className="mb-12 relative">
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
                cafesList.filter(isCafeOnline).map((cafe) => (
                  <span
                    key={cafe.id}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-2xl border border-emerald-200 shadow-sm animate-fadeIn"
                  >
                    {cafe.name}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center bg-rose-50 text-rose-600 font-bold px-3 py-1.5 rounded-2xl border border-rose-200 shadow-sm animate-fadeIn animate-pulse">
                  No Live Cafe
                </span>
              )}
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="mb-4 text-3xl font-extrabold md:text-5xl text-blue-700">
              Welcome, {capitalizeWords(currentCampus?.name || "Campus")}
            </h1>
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
                {cafesList.filter(isCafeOnline).map((cafe) => (
                  <span
                    key={cafe.id}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-250/20 shadow-sm"
                  >
                    {cafe.name}
                  </span>
                ))}
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
                        onClick={() => setShowSnapshot(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 shadow-lg shadow-blue-500/25 transition active:scale-95 duration-200"
                      >
                        <HiOutlineTrendingUp className="h-5 w-5 animate-pulse" />
                        View Live Meal Snapshot
                      </button>

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
                        Cafeterias
                      </span>
                      <span className="mt-1 block text-3xl font-black text-fuchsia-600">
                        {currentCampus?.cafeNumbers?.length || 0}
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

                  {/* Cafeteria Management */}
                  <button
                    onClick={() => router.push("/campus/cafeterias")}
                    className="surface-card rounded-3xl p-6 text-left hover:shadow-lg transition duration-300 group flex flex-col justify-between min-h-48"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                      <HiOutlineSwitchHorizontal className="h-6 w-6" />
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        Campus Cafeterias
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                        Add, review, and authorize cafeteria accounts,
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
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-850 rounded-full">
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
                  className="mb-4 rounded-xl border px-4 py-2 text-base bg-white text-slate-800"
                  value={currentCampus?.selectedCafeNumber || ""}
                  onChange={async (e) => {
                    try {
                      await selectCafeNumber(Number(e.target.value));
                    } catch (err) {
                      showToast(err?.message || "Failed to switch cafe.");
                    }
                  }}
                >
                  <option value="" disabled>
                    Select a cafe
                  </option>
                  {(currentCampus?.cafeNumbers || [1]).map((num) => (
                    <option key={num} value={num}>
                      Cafe {num}
                    </option>
                  ))}
                </select>

                {currentCampus?.selectedCafeNumber && (
                  <div className="w-full mt-4">
                    <h4 className="text-lg font-bold mb-2 text-blue-600 text-center">
                      Snapshot for Cafe {currentCampus.selectedCafeNumber}
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

            {/* Interactive Student Snapshot grid & Fasting Breakdown */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
