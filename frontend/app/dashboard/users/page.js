"use client";

import { React, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@/app/context/UserContext";

const url = process.env.NEXT_PUBLIC_API_URL;

const formatDateTime = (value, fallback = "Not available") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DashboardUsersPage() {
  const { currentUser } = useUser();
  const [campusUsers, setCampusUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCampusUsers = async () => {
      setLoading(true);

      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load user accounts.");
        }

        const campuses = Array.isArray(data.campuses) ? data.campuses : [];
        campuses.sort((left, right) => left.name.localeCompare(right.name));
        setCampusUsers(campuses);
        setError("");
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load user accounts.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampusUsers();
  }, []);

  const stats = useMemo(() => {
    const totalCampusUsers = campusUsers.length;
    const onlineCampusUsers = campusUsers.filter((campus) => campus.isLive).length;

    return {
      totalUsers: 1 + totalCampusUsers,
      totalCampusUsers,
      onlineCampusUsers,
    };
  }, [campusUsers]);

  return (
    <div className="page-shell px-4 pb-10 pt-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="surface-panel rounded-[30px] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            User Management
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Account Overview
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
            This first step gives the admin one place to review the main admin
            account and every campus account that can access the system.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="surface-card rounded-[28px] p-6">
            <p className="text-sm text-slate-500">Total Accounts</p>
            <p className="mt-3 text-4xl font-black text-slate-900">
              {stats.totalUsers}
            </p>
          </div>
          <div className="surface-card rounded-[28px] p-6">
            <p className="text-sm text-slate-500">Campus Accounts</p>
            <p className="mt-3 text-4xl font-black text-slate-900">
              {stats.totalCampusUsers}
            </p>
          </div>
          <div className="surface-card rounded-[28px] p-6">
            <p className="text-sm text-slate-500">Live Campus Accounts</p>
            <p className="mt-3 text-4xl font-black text-emerald-700">
              {stats.onlineCampusUsers}
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card rounded-[28px] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-500">
              Main Admin
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">
              {currentUser?.name || "Admin"}
            </h2>
            <p className="mt-2 break-all text-sm text-slate-600">
              {currentUser?.email || "No email available"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                Role: {currentUser?.role || "admin"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                Account ID {currentUser?._id || "--"}
              </span>
            </div>
            <Link
              href="/dashboard/profile"
              className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Manage Admin Profile
            </Link>
          </div>

          <div className="surface-panel rounded-[28px] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-500">
                  Campus Accounts
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Managed by the admin
                </h2>
              </div>
              <Link
                href="/dashboard/campuses"
                className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Open Campus Management
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-slate-200 bg-white p-5"
                  >
                    <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
                  </div>
                ))
              ) : campusUsers.length > 0 ? (
                campusUsers.map((campus) => (
                  <div
                    key={campus._id}
                    className="rounded-3xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {campus.name}
                        </h3>
                        <p className="mt-1 break-all text-sm text-slate-600">
                          {campus.email}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                            Role: campus
                          </span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                            {campus.cafeCount || 1} cafe
                            {(campus.cafeCount || 1) === 1 ? "" : "s"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              campus.isLive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {campus.isLive ? "Live now" : "Offline"}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-slate-500 lg:text-right">
                        <p>Campus ID {campus.campusId ?? "Not set"}</p>
                        <p className="mt-1">
                          Last active {formatDateTime(campus.lastActiveAt, "Never")}
                        </p>
                        <p className="mt-1">
                          Created {formatDateTime(campus.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  No campus user accounts are available yet.
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
