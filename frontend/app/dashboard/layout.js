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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${url}/dashboard`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace("/");
          }
          return;
        }

        await res.json();
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/");
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 shadow-lg"></div>
          <div className="absolute inset-0 m-auto h-12 w-12 animate-pulse rounded-full bg-blue-100"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }
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
