"use client";

import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { useEffect, useState } from "react";
import { 
  HiOutlineUserGroup, 
  HiOutlineSwitchHorizontal, 
  HiOutlineInformationCircle,
  HiOutlineCheckCircle
} from "react-icons/hi";
import { TbScan } from "react-icons/tb";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function TickerDashboardPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [stats, setStats] = useState({ totalStudents: 0 });

  const activeCafeNum =
    currentUser?.activeCafeNumber || currentUser?.selectedCafeNumber || 1;

  useEffect(() => {
    if (!currentUser || currentUser.role !== "ticker") {
      router.replace("/");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${url}/dashboard/campuses/${currentUser.campusId}/students?cafeNumber=${activeCafeNum}`,
          { credentials: "include" }
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

  if (!currentUser || currentUser.role !== "ticker") return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fadeIn">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Ticker Console
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Scan and validate student meal tickets at your active station.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <HiOutlineCheckCircle className="h-5 w-5" />
          <span>System Active & Online</span>
        </div>
      </div>

      {/* Grid Layout for Stats & Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Station Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl shadow-indigo-500/10 md:col-span-2">
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                Assigned Station
              </span>
              <h2 className="text-3xl font-bold mt-4">
                Cafe Station {activeCafeNum}
              </h2>
              <p className="text-indigo-100/90 mt-2 text-sm">
                Assigned to scan and authenticate meal entries for all student cohorts registered under Cafe Station {activeCafeNum}.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={() => router.push("/ticker/select-cafe-number")}
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition hover:bg-white/25 active:scale-95"
              >
                <HiOutlineSwitchHorizontal className="h-5 w-5" />
                Change Station
              </button>
            </div>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-white/10 blur-2xl"></div>
        </div>

        {/* Scopes & Students Stat Card */}
        <div className="group flex flex-col justify-between rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <HiOutlineUserGroup className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-8">
            <span className="text-slate-400 dark:text-slate-500 text-sm font-semibold uppercase tracking-wider block">
              Assigned Cohort Students
            </span>
            <span className="text-5xl font-black text-slate-900 dark:text-white block mt-1">
              {stats.totalStudents}
            </span>
          </div>
        </div>
      </div>

      {/* Main CTA Section */}
      <div className="flex flex-col items-center justify-center rounded-[3rem] border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-6">
          <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
          <TbScan className="h-12 w-12" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Launch Scanning Terminal
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2 text-sm">
          Open the card scanning screen to authenticate student cards and prevent duplicate meal entries at your active station.
        </p>
        <button
          onClick={() => router.push("/ticker/scan")}
          className="mt-8 flex items-center gap-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 text-lg shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <TbScan className="h-6 w-6" />
          Launch Scanning Terminal
        </button>
      </div>

      {/* System Instructions / Guidelines */}
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-6">
          <HiOutlineInformationCircle className="h-6 w-6 text-slate-400" />
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
            Daily Ticker Guidelines
          </h4>
        </div>
        <div className="grid gap-6 sm:grid-cols-3 text-sm">
          <div className="space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200">1. Position Scanner</div>
            <p className="text-slate-500 dark:text-slate-400">
              Set up the scanning terminal near the entrance with stable internet access to prevent latency.
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200">2. Verify Audio Prompts</div>
            <p className="text-slate-500 dark:text-slate-400">
              Listen for the green validation sound or audio signals on each successful ticket verification.
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200">3. Flag Duplicates</div>
            <p className="text-slate-500 dark:text-slate-400">
              If a duplicate warning is triggered, block entry and ask the student to verify their schedule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
