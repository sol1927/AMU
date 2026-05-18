"use client";

import { React, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardStudentsPage() {
  const router = useRouter();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchCampuses = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`${url}/dashboard/campuses`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not load campuses right now."),
        );
      }

      setCampuses(Array.isArray(data.campuses) ? data.campuses : []);
      setError("");
    } catch (err) {
      const message = getErrorMessage(
        err,
        "We could not load campuses right now.",
      );
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  const sortedCampuses = useMemo(
    () =>
      [...campuses].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      ),
    [campuses],
  );

  return (
    <>
      <div className="page-shell px-4 pb-10 pt-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="surface-panel rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
                  Student Control
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                  Campus Students
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
                  Choose a campus, open its students, then manage fasting,
                  internship, and batch groups from the admin side.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchCampuses({ silent: true })}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="surface-card rounded-[28px] p-6">
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="mt-8 h-10 w-28 animate-pulse rounded bg-slate-200" />
                </div>
              ))
            ) : sortedCampuses.length > 0 ? (
              sortedCampuses.map((campus) => (
                <div
                  key={campus._id}
                  className="surface-card rounded-[28px] p-6 transition hover:-translate-y-1 hover:border-cyan-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-lg font-black text-cyan-700">
                      {campus.logo?.url ? (
                        <img
                          src={campus.logo.url}
                          alt={campus.name || "Campus logo"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        campus.name?.[0] || "C"
                      )}
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {campus.name}
                      </h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-600">
                        Campus ID {campus.campusId ?? "Not set"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {campus.location || "Location not set"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <p className="text-sm text-slate-600">Current Students</p>
                    <p className="mt-2 text-4xl font-black text-slate-900">
                      {campus.students ?? 0}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/students/${campus._id}`)
                      }
                      className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      Open Students
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/students/${campus._id}/groups`)
                      }
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Batches
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600 md:col-span-2 xl:col-span-3">
                No campuses available right now.
              </div>
            )}
          </div>

          {error && <p className="mt-6 text-red-600">{error}</p>}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-2xl px-4 py-3 text-white shadow-2xl ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
