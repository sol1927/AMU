"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PropTypes from "prop-types";
import CafeManagerNavbar from "../components/CafeManagerNavbar";
import { useUser } from "../context/UserContext";

export default function CafeManagerLayout({ children }) {
  const router = useRouter();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser === undefined) return;

    if (currentUser === null || currentUser.role !== "cafe manager") {
      router.replace("/");
      return;
    }

    setLoading(false);
  }, [currentUser, router]);

  if (loading) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 shadow-lg dark:border-slate-800"></div>
          <div className="absolute inset-0 m-auto h-12 w-12 animate-pulse rounded-full bg-blue-100/50 dark:bg-blue-900/30"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen pt-20 bg-slate-50/50 text-slate-900 transition-colors duration-300">
      <CafeManagerNavbar />
      <main className="mx-auto max-w-screen-2xl p-6">{children}</main>
    </div>
  );
}

CafeManagerLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
