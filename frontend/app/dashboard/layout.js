"use client";

// DashboardLayout.js
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../components/AdminNavbar";
import { useUser } from "../context/UserContext"; // ✅ import user context

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { currentUser } = useUser(); // ✅ get logged-in user
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/dashboard", {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/");
          return;
        }

        const data = await res.json();
        setStats(data.stats); // only dashboard stats
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <>
      <AdminNavbar admin={currentUser} /> {/* ✅ get user info from context */}
      {children}
    </>
  );
}
