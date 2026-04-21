"use client";

import { React, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "../context/UserContext";

const url = process.env.NEXT_PUBLIC_API_URL;

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function AdminDashboardPage() {
  const { currentUser } = useUser();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingLiveCampuses, setRefreshingLiveCampuses] = useState(false);

  const fetchCampuses = async (manual = false) => {
    try {
      if (manual) {
        setRefreshingLiveCampuses(true);
      } else {
        setLoading(true);
      }

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
    } catch {
      setCampuses([]);
    } finally {
      setLoading(false);
      setRefreshingLiveCampuses(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  useEffect(() => {
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
  }, []);

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
    () => campuses.filter((campus) => campus.isLive),
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

          <div className="surface-card rounded-[30px] p-7 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">
                Live Campuses
              </p>
              <button
                type="button"
                onClick={() => fetchCampuses(true)}
                disabled={refreshingLiveCampuses}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  refreshingLiveCampuses
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {refreshingLiveCampuses ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  </div>
                ))
              ) : liveCampuses.length > 0 ? (
                liveCampuses.slice(0, 4).map((campus) => (
                  <div
                    key={campus._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {campus.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-600">
                      Campus ID {campus.campusId ?? "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {campus.location || "Location not set"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No campuses are live right now.
                </div>
              )}
            </div>
          </div>
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-lg font-black text-cyan-700">
                      {campus.name?.charAt(0) || "C"}
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
    </div>
  );
}
