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

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load campuses");
        }

        const data = await res.json();
        setCampuses(Array.isArray(data.campuses) ? data.campuses : []);
      } catch (error) {
        console.error("Fetch error:", error);
        setCampuses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_#08111f_0%,_#0f172a_46%,_#162235_100%)] px-4 pb-10 pt-24 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/6 p-7 shadow-2xl backdrop-blur-xl md:p-9">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
              Main Admin
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              Welcome, {capitalizeWords(currentUser?.name) || "Admin"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
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
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Open Meal History
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,_rgba(8,47,73,0.9),_rgba(15,23,42,0.95))] p-7 shadow-2xl backdrop-blur-xl md:p-8">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">
              Live Campuses
            </p>
            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                  </div>
                ))
              ) : campuses.length > 0 ? (
                campuses.slice(0, 4).map((campus) => (
                  <div
                    key={campus._id}
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4"
                  >
                    <p className="font-semibold text-white">{campus.name}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {campus.location || "Location not set"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-sm text-slate-300">
                  No campuses found yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {dashboardFacts.map((item) => (
            <div
              key={item.title}
              className="rounded-[28px] border border-white/10 bg-slate-950/50 p-6 shadow-xl backdrop-blur-xl"
            >
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
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
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Manage Campuses
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-4 w-24 animate-pulse rounded bg-white/10" />
                </div>
              ))
            ) : campuses.length > 0 ? (
              campuses.map((campus) => (
                <div
                  key={campus._id}
                  className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,_rgba(30,41,59,0.7),_rgba(15,23,42,0.9))] p-5 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-lg font-black text-cyan-200">
                      {campus.name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {campus.name}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {campus.location || "Location not set"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-slate-400">{campus.email}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                No campuses available right now.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
