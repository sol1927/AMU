"use client";

import { React, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

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
  const { currentCampus, loading } = useCampus();
  const [detailMode, setDetailMode] = useState("regular");
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

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchDashboardStats = useCallback(
    async (manual = false) => {
      if (!currentCampus?.selectedCafeNumber) return;
      if (manual) setIsRefreshing(true);

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

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

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
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200"></div>
          <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell min-h-screen px-6 pb-12 pt-20 md:px-20 md:pt-28">
        <section className="mb-12">
          <div className="text-center">
          <h1 className="mb-4 text-3xl font-extrabold md:text-5xl">
            Welcome,{" "}
            <span className="text-blue-600">
              {capitalizeWords(
                currentCampus?.cafeDisplayName || currentCampus?.name || "Campus",
              )}
            </span>
          </h1>
          <p className="text-lg text-slate-600 md:text-xl">
            Monitor students and meals at a glance.
          </p>
          <p className="mt-3 text-sm font-semibold text-cyan-700">
            Serving at Cafe {currentCampus?.selectedCafeNumber || "--"}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">
            Current Dashboard Session: {stats.mealLabel}
          </p>
          </div>
        </section>

        <section className="mx-auto mb-8 grid max-w-6xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_280px]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <div className="surface-card rounded-3xl p-8 transition-transform hover:-translate-y-1">
              <h3 className="mb-2 text-lg font-semibold text-blue-600">
                Total Students ({stats.mealLabel})
              </h3>
              <p className="text-4xl font-bold md:text-5xl">
                {stats.totalStudents}
              </p>
            </div>

            <div className="surface-card rounded-3xl p-8 transition-transform hover:-translate-y-1">
              <h3 className="mb-2 text-lg font-semibold text-sky-600">
                Regular Students ({stats.mealLabel})
              </h3>
              <p className="text-4xl font-bold md:text-5xl">
                {stats.regularStudents}
              </p>
            </div>

            <div className="surface-card rounded-3xl p-8 transition-transform hover:-translate-y-1">
              <h3 className="mb-2 text-lg font-semibold text-fuchsia-600">
                Internship Students ({stats.mealLabel})
              </h3>
              <p className="text-4xl font-bold md:text-5xl">
                {stats.internshipStudents}
              </p>
            </div>
          </div>

          <aside className="surface-panel flex flex-col justify-between rounded-3xl p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Quick Action
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                Refresh Dashboard
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pull the latest scan totals and session status for{" "}
                {stats.mealLabel}.
              </p>
            </div>

            <button
              onClick={() => fetchDashboardStats(true)}
              disabled={isRefreshing}
              className={`mt-6 flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 shadow-lg transition active:scale-95 ${
                isRefreshing
                  ? "cursor-not-allowed bg-slate-300 text-slate-600"
                  : "app-primary-btn hover:-translate-y-0.5"
              }`}
            >
              {isRefreshing && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              )}
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </aside>
        </section>

        <section className="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
                <p className="text-sm text-slate-600">Internship Students</p>
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
            <p className="mt-1 text-sm text-slate-500">{getBreakdownTitle()}</p>

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

        <section className="mx-auto mb-10 max-w-4xl">
          <div className="surface-panel rounded-3xl p-6">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Recent Scans ({stats.mealLabel})
            </h2>
            {stats.recentScans.length > 0 ? (
              <ul className="divide-y divide-slate-200">
                {stats.recentScans.map((scan, idx) => (
                  <li key={idx} className="flex justify-between py-2">
                    <span className="max-w-[70%] truncate">{scan.name}</span>
                    <span className="text-sm text-slate-500">
                      {new Date(scan.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No scans yet today.</p>
            )}
          </div>
        </section>
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
    </>
  );
}

