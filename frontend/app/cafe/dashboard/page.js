"use client";

import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { useEffect, useState } from "react";
import {
  HiOutlineUserGroup,
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
} from "react-icons/hi";
import { TbScan } from "react-icons/tb";

const url = process.env.NEXT_PUBLIC_API_URL;

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function CafeOperatorDashboardPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [stats, setStats] = useState({ totalStudents: 0 });

  const activeCafeNum =
    currentUser?.activeCafeNumber || currentUser?.selectedCafeNumber || 1;

  useEffect(() => {
    if (!currentUser || currentUser.role !== "cafe") {
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

  if (!currentUser || currentUser.role !== "cafe") return null;

  return (
    <div className="page-shell min-h-screen px-6 pb-12 pt-6 md:px-20 md:pt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 animate-fadeIn">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-500/80 font-bold">
              Cafe Operator
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-blue-700 sm:text-5xl">
              Welcome, {capitalizeWords(currentUser?.displayName || currentUser?.name) || "Operator"}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Scan and record student meals at your active cafe station.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-700 dark:text-white">
            <HiOutlineCheckCircle className="h-5 w-5" />
            <span>System Active & Online</span>
          </div>
        </div>

        {/* Grid Layout for Stats & Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Launch Scanning Terminal Card */}
          <div className="surface-card rounded-[2.5rem] p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 text-blue-600 mb-4 dark:bg-slate-950 dark:text-blue-400">
                <TbScan className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-inherit">
                Launch Scanning Terminal
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 mb-6">
                Open the card scanning screen to authenticate student cards.
              </p>
            </div>
            <button
              onClick={() => router.push("/cafe/scan")}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 text-sm shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <TbScan className="h-5 w-5" />
              <span className="text-inherit">Launch Scanning Terminal</span>
            </button>
          </div>

          {/* Assigned Cohort Students Stat Card */}
          <div className="surface-panel group flex flex-col justify-between rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-blue-50 p-4 text-blue-600 dark:bg-slate-950 dark:text-blue-450">
                <HiOutlineUserGroup className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-8">
              <span className="text-sm font-semibold uppercase tracking-wider block text-inherit">
                Assigned Cohort Students
              </span>
              <span className="text-4xl font-black block mt-1 text-inherit">
                {stats.totalStudents}
              </span>
            </div>
          </div>
        </div>

        {/* System Instructions / Guidelines */}
        <div className="surface-panel rounded-[2.5rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <HiOutlineInformationCircle className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            <h4 className="text-lg font-bold text-inherit">
              Daily Cafe Guidelines
            </h4>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-inherit">
                1. Position Scanner
              </div>
              <p className="text-inherit">
                Set up the scanning terminal within direct sight of student ID
                cards, with stable internet access to prevent latency.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-inherit">
                2. Confirm Each Scan
              </div>
              <p className="text-inherit">
                Look for the green confirmation screen after each scan to ensure
                the meal has been successfully recorded for the student.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-inherit">
                3. Flag Duplicates
              </div>
              <p className="text-inherit">
                If a duplicate warning appears, the system has already recorded
                a meal for that student in this session — do not re-scan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
