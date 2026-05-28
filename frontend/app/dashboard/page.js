"use client";

import { React, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";
import {
  buildAppDateTime,
  getAppDayString,
  getAppMinutesFromDate,
} from "@/app/utils/appTimezone";

const url = process.env.NEXT_PUBLIC_API_URL;

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatActivityTime = (value, fallback = "Not opened yet") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Addis_Ababa",
  });
};

const getAppliedWindowStatus = (appliedWindowLabel) => {
  if (!appliedWindowLabel) return "--:-- - --:--";

  const parts = String(appliedWindowLabel)
    .split("-")
    .map((part) => part.trim());
  if (parts.length !== 2) return appliedWindowLabel;

  const [endHour, endMinute] = parts[1].split(":").map(Number);
  if (Number.isNaN(endHour) || Number.isNaN(endMinute)) {
    return appliedWindowLabel;
  }

  const nowMinutes = getAppMinutesFromDate();
  const endMinutes = endHour * 60 + endMinute;

  return nowMinutes >= endMinutes ? "Completed" : appliedWindowLabel;
};

const isAppliedWindowCompleted = (appliedWindowLabel) =>
  getAppliedWindowStatus(appliedWindowLabel) === "Completed";

const getAppliedWindowPhase = (appliedWindowLabel) => {
  if (!appliedWindowLabel) return "unknown";

  const parts = String(appliedWindowLabel)
    .split("-")
    .map((part) => part.trim());
  if (parts.length !== 2) return "active";

  const [startHour, startMinute] = parts[0].split(":").map(Number);
  const [endHour, endMinute] = parts[1].split(":").map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return "active";
  }

  const nowMinutes = getAppMinutesFromDate();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (nowMinutes < startMinutes) return "before_start";
  if (nowMinutes >= endMinutes) return "completed";
  return "active";
};

const getAppliedWindowStartTime = (appliedWindowLabel) => {
  if (!appliedWindowLabel) return null;

  const parts = String(appliedWindowLabel)
    .split("-")
    .map((part) => part.trim());
  if (parts.length !== 2) return null;

  const [startHour, startMinute] = parts[0].split(":").map(Number);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
    return null;
  }

  return buildAppDateTime(getAppDayString(), startHour, startMinute);
};

const getLiveCampusOpenedTime = (campus) => {
  if (campus.openingTime) {
    return formatActivityTime(campus.openingTime);
  }

  if (
    campus.isLive &&
    getAppliedWindowPhase(campus.currentSessionAppliedWindow) === "active"
  ) {
    const appliedStartTime = getAppliedWindowStartTime(
      campus.currentSessionAppliedWindow,
    );

    if (appliedStartTime) {
      return formatActivityTime(appliedStartTime.toISOString());
    }
  }

  return "Not opened yet";
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingLiveCampuses, setRefreshingLiveCampuses] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setShowSecurityWarning(true);
    }
  }, [currentUser]);

  const fetchCampuses = async (manual = false) => {
    if (!currentUser) {
      setCampuses([]);
      setLoading(false);
      setRefreshingLiveCampuses(false);
      return;
    }

    try {
      if (manual) {
        setRefreshingLiveCampuses(true);
      } else {
        setLoading(true);
      }

      const res = await fetch(`${url}/dashboard/campuses`, {
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        setCampuses([]);
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load campuses");
      }

      const data = await res.json();
      const campusList = Array.isArray(data.campuses) ? data.campuses : [];
      campusList.sort((a, b) => a.name.localeCompare(b.name));
      setCampuses(campusList);
    } catch {
      setCampuses([]);
    } finally {
      setLoading(false);
      setRefreshingLiveCampuses(false);
    }
  };

  const fetchApprovals = async () => {
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
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${url}/approvals/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        fetchApprovals();
        fetchCampuses(true);
      }
    } catch (err) {
      console.error("Failed to approve:", err);
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
      }
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setCampuses([]);
      setApprovals([]);
      setLoading(false);
      return;
    }

    fetchCampuses();
    fetchApprovals();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      fetchCampuses(true);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCampuses(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser]);

  const dashboardFacts = useMemo(
    () => [
      {
        title: "Campus Control",
        text: "Open and manage each campus from one place with cleaner navigation and admin actions.",
      },
      {
        title: "Meal History",
        text: "Use the history page to check one date and one session without mixing it with dashboard counts.",
      },
      {
        title: "Student Management",
        text: "Track the current registered student count for every campus as soon as the admin opens the page.",
      },
    ],
    [],
  );

  const liveCampuses = useMemo(
    () =>
      campuses.flatMap((campus) => {
        if (!campus.isLive) {
          return [];
        }

        if (
          Array.isArray(campus.liveCafeSessions) &&
          campus.liveCafeSessions.length > 0
        ) {
          return campus.liveCafeSessions.map((session) => ({
            ...campus,
            ...session,
          }));
        }

        return [campus];
      }),
    [campuses],
  );

  return (
    <div className="page-shell px-4 pb-10 pt-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-panel rounded-[30px] p-7 md:p-9">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
              Main Admin
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              Welcome, {capitalizeWords(currentUser?.name) || "Admin"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              This dashboard stays focused on navigation and campus oversight.
              Meal totals are now kept in the history page, so this space is
              lighter and easier to read.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/campuses"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01]"
              >
                Open Campuses
              </Link>
              <Link
                href="/dashboard/meals"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Open Meal History
              </Link>
            </div>
          </div>

          {/* Live Campuses section moved to campus dashboard */}
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {dashboardFacts.map((item) => (
            <div key={item.title} className="surface-card rounded-[28px] p-6">
              <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.text}
              </p>
            </div>
          ))}
        </section>

        {approvals.length > 0 && (
          <section className="surface-panel mt-8 rounded-[30px] p-6 md:p-8 border border-amber-500/25 bg-amber-500/5">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-500 font-bold">
                Verification Queue
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl text-slate-900">
                Pending Campus Approvals
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Campuses have requested profile updates that require your
                validation before taking effect.
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
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
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                        Pending Admin Review
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      {req.pendingData?.name && (
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                            Name:
                          </span>
                          <span className="flex-1 text-right break-words text-slate-850 font-medium">
                            {req.pendingData.name}
                          </span>
                        </div>
                      )}
                      {req.pendingData?.location && (
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                            Location:
                          </span>
                          <span className="flex-1 text-right break-words text-slate-850 font-medium">
                            {req.pendingData.location}
                          </span>
                        </div>
                      )}
                      {req.pendingData?.email && (
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                            Email:
                          </span>
                          <span className="flex-1 text-right break-words text-slate-850 font-medium">
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
                            •••••• (Security Password Reset Request)
                          </span>
                        </div>
                      )}
                      {req.pendingData?.logo && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase w-20">
                            Logo Update:
                          </span>
                          <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            New File Attached
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl text-xs font-bold transition-all border border-rose-200/50"
                    >
                      Reject Changes
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10"
                    >
                      Approve Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="surface-panel mt-8 rounded-[30px] p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/75">
                Campus Directory
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">
                Your current campuses
              </h2>
            </div>
            <Link
              href="/dashboard/campuses"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Manage Campuses
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-slate-200 bg-white p-5"
                >
                  <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              ))
            ) : campuses.length > 0 ? (
              campuses.map((campus) => (
                <div key={campus._id} className="surface-card rounded-3xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-lg font-black text-cyan-700">
                      {campus.logo?.url ? (
                        <img
                          src={campus.logo.url}
                          alt={campus.name || "Campus logo"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        campus.name?.charAt(0) || "C"
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {campus.name}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-600">
                        Campus ID {campus.campusId ?? "Not set"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {campus.location || "Location not set"}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                        {campus.cafeCount || 1} cafe
                        {(campus.cafeCount || 1) === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-slate-500">{campus.email}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 md:col-span-2 xl:col-span-3">
                No campuses available right now.
              </div>
            )}
          </div>
        </section>
      </div>

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
                For maximum security, please change your default administrator
                email and password.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => router.push("/dashboard/profile")}
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
    </div>
  );
}
