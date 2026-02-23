"use client";

import { useUser } from "../context/UserContext";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminDashboardPage() {
  const { currentUser } = useUser();
  const [totalCampuses, setTotalCampuses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!navigator.onLine) {
        console.warn("No internet connection");
        setLoading(false);
        setTotalCampuses(0);
        setTotalStudents(0);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/dashboard/campuses`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data?.campuses && Array.isArray(data.campuses)) {
          setTotalCampuses(data.campuses.length);
          const totalStudents = data.campuses.reduce(
            (sum, campus) => sum + (campus.students || 0),
            0,
          );
          setTotalStudents(totalStudents);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching admin dashboard:", err);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br pt-28 text-white px-6 md:px-20 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
          Welcome,{" "}
          <span className="text-blue-400">{currentUser?.name || "Admin"}</span>
        </h1>
        <p className="text-gray-300 mb-10 text-lg md:text-xl">
          Monitor your campuses and students at a glance 👀
        </p>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-4xl mx-auto">
        <div className="bg-gradient-to-tr from-blue-600/40 to-blue-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">
            Total Campuses
          </h3>
          <p className="text-4xl md:text-5xl font-bold">
            {loading ? "..." : totalCampuses}
          </p>
        </div>

        <div className="bg-gradient-to-tr from-green-600/40 to-green-500/20 border border-white/10 rounded-2xl p-8 shadow-lg hover:scale-105 transition-transform">
          <h3 className="text-lg font-semibold text-green-300 mb-2">
            Total Students
          </h3>
          <p className="text-4xl md:text-5xl font-bold">
            {loading ? "..." : totalStudents}
          </p>
        </div>
      </section>
      {/* Cafeteria System Overview */}
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
          {/* Left Side - Description */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              📊 System Purpose
            </h3>
            <p className="text-gray-300 leading-relaxed">
              This platform manages and monitors student meal distribution
              across campuses using secure ID card scanning. Each student scans
              their ID card to receive meals, ensuring accurate and efficient
              attendance tracking.
            </p>

            <div className="mt-6 space-y-2 text-sm text-gray-400">
              <p>⚡ One meal per session (Breakfast, Lunch, Dinner)</p>
              <p>🧹 Manual reset using the Clear button when needed</p>
              <p>🚫 Prevents duplicate meal scans</p>
              <p>🛠️ Centralized campus and student management</p>{" "}
            </div>
          </div>

          {/* Right Side - Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-blue-600/20 border border-blue-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-blue-300 font-semibold mb-2">
                🏫 Campus Management
              </h4>
              <p className="text-gray-400 text-sm">
                Add, update, and manage all registered campuses within the
                system.
              </p>
            </div>

            <div className="bg-green-600/20 border border-green-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-green-300 font-semibold mb-2">
                👨‍🎓 Student Verification
              </h4>
              <p className="text-gray-400 text-sm">
                Students are verified instantly through ID card scanning.
              </p>
            </div>

            <div className="bg-purple-600/20 border border-purple-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-purple-300 font-semibold mb-2">
                🚫 Duplicate Prevention
              </h4>
              <p className="text-gray-400 text-sm">
                Automatically blocks repeated scans within the same meal
                session.
              </p>
            </div>

            <div className="bg-yellow-600/20 border border-yellow-500/20 rounded-xl p-6 hover:scale-105 transition">
              <h4 className="text-yellow-300 font-semibold mb-2">
                ⚙️ Administrative Control
              </h4>
              <p className="text-gray-400 text-sm">
                Manage campuses, register students, and maintain system
                accuracy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
