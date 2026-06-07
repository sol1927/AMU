"use client";

import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { useEffect, useState } from "react";
import {
  HiOutlineUserGroup,
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineUsers,
  HiOutlineClipboardList,
} from "react-icons/hi";
import { TbScan } from "react-icons/tb";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CafeDashboardPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [stats, setStats] = useState({ totalStudents: 0 });
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const isCafeManager = currentUser?.role === "cafe manager";
  const basePath = "/cafe-manager";

  const activeCafeNum =
    currentUser?.activeCafeNumber || currentUser?.selectedCafeNumber || 1;

  useEffect(() => {
    setShowSecurityWarning(!!currentUser?.mustChangePassword);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "cafe manager") {
      router.replace("/");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${url}/dashboard/campuses/${currentUser.campusId}/students?cafeNumber=${activeCafeNum}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          setStats({ totalStudents: data.totalStudents || 0 });
        }
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      }
    };

    fetchStats();
  }, [currentUser, activeCafeNum, router]);

  if (!currentUser || currentUser.role !== "cafe manager") {
    return null;
  }

  return (
    <div className="page-shell min-h-screen px-6 pb-12 pt-6 md:px-20 md:pt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 animate-fadeIn">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-700 sm:text-5xl">
              {isCafeManager ? "Cafe Manager Dashboard" : "Cafe Dashboard"}
            </h1>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
              {isCafeManager
                ? "Manage cafe accounts, student records, and cafeteria operations."
                : "Manage your cafe station, scanning, and student records."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-700 dark:text-white">
            <HiOutlineCheckCircle className="h-5 w-5" />
            <span>
              {isCafeManager
                ? "Cafe Manager Console Active"
                : "Cafe Console Active"}
            </span>
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="surface-panel relative overflow-hidden rounded-3xl p-8 md:col-span-2">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex h-full flex-col justify-between space-y-6">
              <div>
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                  {isCafeManager ? "Manager Workspace" : "Active Station"}
                </span>
                <h2 className="mt-4 text-3xl font-black text-inherit">
                  {isCafeManager
                    ? "Cafe Manager Console"
                    : `Cafe Station ${activeCafeNum}`}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {isCafeManager
                    ? "Create and manage cafe accounts, review student records, and keep cafeteria operations organized."
                    : `Managing meal sessions and access authentication for student cohorts under Cafe Station ${activeCafeNum}.`}
                </p>
              </div>
              {!isCafeManager && (
                <div className="pt-4">
                  <button
                    onClick={() =>
                      router.push("/cafe-manager/select-cafe-number")
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95"
                  >
                    Change Station
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="surface-card flex flex-col justify-between rounded-3xl p-8">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-blue-50 p-4 text-blue-600">
                <HiOutlineUserGroup className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-8">
              <span className="block text-sm font-semibold uppercase tracking-wider text-inherit">
                Assigned Cohort Students
              </span>
              <span className="mt-1 block text-5xl font-black text-inherit">
                {stats.totalStudents}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {!isCafeManager && (
            <button
              onClick={() => router.push("/cafe-manager/scan")}
              className="surface-card flex flex-col items-start rounded-3xl p-6 text-left transition hover:shadow-lg"
            >
              <div className="mb-4 rounded-2xl bg-blue-50 p-3 text-blue-600">
                <TbScan className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-inherit">Launch Scanner</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Open the scanning terminal to authenticate student ID cards.
              </p>
            </button>
          )}

          <button
            onClick={() => router.push("/cafe-manager/cafes")}
            className="surface-card flex flex-col items-start rounded-3xl p-6 text-left transition hover:shadow-lg"
          >
            <div className="mb-4 rounded-2xl bg-sky-50 p-3 text-sky-600">
              <HiOutlineClipboardList className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-inherit">Manage Cafes</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create, update, and manage cafeteria accounts.
            </p>
          </button>

          <button
            onClick={() => router.push(`${basePath}/students`)}
            className="surface-card flex flex-col items-start rounded-3xl p-6 text-left transition hover:shadow-lg"
          >
            <div className="mb-4 rounded-2xl bg-fuchsia-50 p-3 text-fuchsia-600">
              <HiOutlineUsers className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-inherit">
              Student Directory
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isCafeManager
                ? "Browse and search students across your managed cafes."
                : "Browse and search students assigned to your cafe station."}
            </p>
          </button>
        </section>

        <section className="surface-panel rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <HiOutlineInformationCircle className="h-6 w-6 text-slate-400" />
            <h4 className="text-lg font-bold text-inherit">
              Daily Scanning Guidelines
            </h4>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-inherit">
                1. Position Device
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Ensure the scanning scanner is positioned in direct sight, with
                stable network access to prevent latency.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-inherit">
                2. Verify Scan Prompt
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Listen for the audio prompt or look for the green confirmation
                screen on each student card validation.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-inherit">
                3. Duplicate Warning
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                If a student attempts to scan twice during the same session, the
                terminal will flash red and deny exit access.
              </p>
            </div>
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
                For maximum security, please change your default cafeteria
                credentials (email/username and password).
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => router.push(`${basePath}/profile`)}
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
