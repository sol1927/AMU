"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CafeNavbar from "../components/CafeNavbar";
import { useUser } from "../context/UserContext";
import PropTypes from "prop-types";

export default function CafeOperatorLayout({ children }) {
  const router = useRouter();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser !== undefined) {
      if (currentUser === null || currentUser.role !== "cafe") {
        router.replace("/");
        return;
      }
      setLoading(false);
    }
  }, [currentUser, router]);

  if (loading) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center bg-white dark:bg-slate-900">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 shadow-lg dark:border-slate-800"></div>
          <div className="absolute inset-0 m-auto h-12 w-12 animate-pulse rounded-full bg-blue-100/50 dark:bg-blue-900/30"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 bg-slate-50/50 text-slate-900 transition-colors duration-300">
      <CafeNavbar />
      <main className="mx-auto max-w-screen-2xl px-4 pb-4 pt-0">{children}</main>
    </div>
  );
}

CafeOperatorLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
