"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../components/AdminNavbar";
import { useUser } from "../context/UserContext";
import PropTypes from "prop-types";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { currentUser } = useUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${url}/dashboard`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/");
          return;
        }

        const data = await res.json();
        setStats(data.stats);
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
      <AdminNavbar admin={currentUser} />
      {children}
    </>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
