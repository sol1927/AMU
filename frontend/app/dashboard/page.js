"use client";

import { React, useUser } from "../context/UserContext";
import { useEffect, useState, useCallback } from "react";

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
  const [totalCampuses, setTotalCampuses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [servedToday, setServedToday] = useState(0);
  const [pendingStudents, setPendingStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${url}/dashboard`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data?.campuses && Array.isArray(data.campuses)) {
        setTotalCampuses(data.campuses.length);

        const total = data.campuses.reduce(
          (sum, campus) => sum + (Number(campus.students) || 0),
          0,
        );

        const served = data.campuses.reduce(
          (sum, campus) => sum + (Number(campus.served) || 0),
          0,
        );

        setTotalStudents(total);
        setServedToday(served);
        setPendingStudents(Math.max(total - served, 0));
      }
      setLoading(false);
    } catch (error) {
      console.error("Fetch error:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br pt-28 text-white px-6 md:px-20 py-12">
      <section className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
          Welcome,{" "}
          <span className="text-blue-400">
            {capitalizeWords(currentUser?.name) || "Admin"}
          </span>
        </h1>
        <p className="text-gray-300 mb-10 text-lg md:text-xl">
          Monitor your campuses and students at a glance 👀
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
        <div className="bg-gradient-to-tr from-blue-600/40 to-blue-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">
            Total Campuses
          </h3>
          <p className="text-4xl md:text-5xl font-bold">
            {loading ? "..." : totalCampuses}
          </p>
        </div>

        <div className="bg-gradient-to-tr from-indigo-600/40 to-indigo-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-indigo-300 mb-2">
            Total Students
          </h3>
          <p className="text-4xl md:text-5xl font-bold">
            {loading ? "..." : totalStudents}
          </p>
        </div>

        <div className="bg-gradient-to-tr from-green-600/40 to-green-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-green-300 mb-2">
            Served Today
          </h3>
          <p className="text-4xl md:text-5xl font-bold">
            {loading ? "..." : servedToday}
          </p>
        </div>

        <div className="bg-gradient-to-tr from-yellow-500/40 to-orange-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Pending</h3>
          <p className="text-4xl md:text-5xl font-bold">
            {loading ? "..." : pendingStudents}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto mt-8 flex justify-end">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="bg-gray-700/50 hover:bg-gray-600 border border-white/10 px-6 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Refresh"}
        </button>
      </div>

      <section className="max-w-6xl mx-auto mt-8 mb-10 ">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-400 mb-3">
            🍽️ Cafeteria Control Center{" "}
          </h2>
          <p className="text-gray-400 text-lg">
            Smart meal management powered by secure student ID card scanning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              📊 System Purpose
            </h3>
            <p className="text-gray-300 leading-relaxed">
              This platform manages and monitors student meal distribution
              across campuses using secure ID card scanning.
            </p>

            <div className="mt-6 space-y-2 text-sm text-gray-400">
              <p>⚡ One meal per session (Breakfast, Lunch, Dinner)</p>
              <p>🧹 Manual reset using the Clear button when needed</p>
              <p>🚫 Prevents duplicate meal scans</p>
              <p>🛠️ Centralized campus and student management</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-blue-600/20 border border-blue-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-blue-300 font-semibold mb-2">
                🏫 Campus Management
              </h4>
              <p className="text-gray-400 text-sm">
                Add, update, and manage all registered campuses.
              </p>
            </div>

            <div className="bg-green-600/20 border border-green-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-green-300 font-semibold mb-2">
                👨‍🎓 Student Verification
              </h4>
              <p className="text-gray-400 text-sm">
                Students are verified instantly through scanning.
              </p>
            </div>

            <div className="bg-purple-600/20 border border-purple-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-purple-300 font-semibold mb-2">
                🚫 Duplicate Prevention
              </h4>
              <p className="text-gray-400 text-sm">
                Blocks repeated scans within the same session.
              </p>
            </div>

            <div className="bg-yellow-600/20 border border-yellow-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-yellow-300 font-semibold mb-2">
                ⚙️ Administrative Control
              </h4>
              <p className="text-gray-400 text-sm">
                Manage campuses and maintain system accuracy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
