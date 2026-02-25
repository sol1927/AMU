"use client";

import { React, useEffect, useState, useCallback } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function CampusDashboardPage() {
  const { currentCampus, loading } = useCampus();

  const [stats, setStats] = useState({
    totalStudents: 0,
    servedStudents: 0,
    pendingStudents: 0,
    recentScans: [],
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchDashboardStats = useCallback(async () => {
    if (!currentCampus) return;

    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
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
        totalStudents: total,
        servedStudents: served,
        pendingStudents: Math.max(total - served, 0),
        recentScans: data.recentScans || [],
      });
    } catch {
      showToast("Failed to load dashboard");
    }
  }, [currentCampus]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const handleOffline = () => {
      showToast("You are offline");
    };

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  if (loading) {
    return <p className="p-6 text-center mt-24 text-gray-600">Loading...</p>;
  }

  if (!currentCampus) {
    return (
      <p className="p-6 text-center mt-24 text-red-600">
        Campus data not found. Please log in again.
      </p>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="min-h-screen text-white pt-20 md:pt-28 px-6 md:px-20 pb-12">
        <section className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Welcome,{" "}
            <span className="text-yellow-400">
              {capitalizeWords(currentCampus?.name || "Campus")}
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl">
            Monitor students and meals at a glance 🍽️
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto mb-10">
          <div className="bg-gradient-to-tr from-blue-600/40 to-blue-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              Total Students
            </h3>
            <p className="text-4xl md:text-5xl font-bold">
              {stats.totalStudents}
            </p>
          </div>

          <div className="bg-gradient-to-tr from-green-600/40 to-green-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
            <h3 className="text-lg font-semibold text-green-300 mb-2">
              Served Today
            </h3>
            <p className="text-4xl md:text-5xl font-bold">
              {stats.servedStudents}
            </p>
          </div>

          <div className="bg-gradient-to-tr from-yellow-500/40 to-blue-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
            <h3 className="text-lg font-semibold text-red-300 mb-2">Pending</h3>
            <p className="text-4xl md:text-5xl font-bold">
              {stats.pendingStudents}
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto mb-4">
          <div className="flex justify-end">
            <button
              onClick={fetchDashboardStats}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 shadow-lg transition"
            >
              Refresh Stats
            </button>
          </div>
        </div>

        <section className="max-w-4xl mx-auto mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <h2 className="font-bold text-2xl text-yellow-400 mb-4">
              Recent Scans
            </h2>
            {stats.recentScans.length > 0 ? (
              <ul className="divide-y divide-white/20">
                {stats.recentScans.map((scan, idx) => (
                  <li key={idx} className="flex justify-between py-2">
                    <span className="truncate max-w-[70%]">{scan.name}</span>{" "}
                    <span className="text-gray-300 text-sm">
                      {new Date(scan.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No scans yet today.</p>
            )}
          </div>
        </section>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-xl text-white shadow-lg transition sm:bottom-6 sm:right-6 ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
