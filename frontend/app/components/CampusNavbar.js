"use client";

import ConfirmModal from "./ConfirmModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { React, useEffect, useRef, useState } from "react";
import { useCampus } from "../context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase())
        .join("-"),
    )
    .join(" ");
};

export default function CampusNavbar() {
  const router = useRouter();
  const { currentCampus } = useCampus();
  const [openMenu, setOpenMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setOpenMenu(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);

    try {
      const res = await fetch(`${url}/campus/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        return;
      }

      router.replace("/");
      } catch {}
  };

  return (
    <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => router.push("/campus")}
      >
        <Image
          src="/logo.png"
          alt="GibiGebeta"
          width={40}
          height={40}
          className="rounded-full object-cover group-hover:scale-105 transition-transform"
          priority
        />
        <span className="text-xl font-bold tracking-wide text-slate-900">
          Gibi<span className="text-blue-500">Gebeta</span>
        </span>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 hover:bg-slate-100"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-500/40">
            {currentCampus?.logo?.url ? (
              <Image
                src={currentCampus.logo.url}
                alt="GibiGebeta"
                width={36}
                height={36}
                className="object-cover w-full h-full rounded-full"
                priority
              />
            ) : (
              <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center rounded-full font-bold">
                {capitalizeWords(currentCampus?.name?.charAt(0) || "C")}
              </div>
            )}
          </div>

          <span className="max-w-[120px] truncate font-medium text-slate-700">
            {capitalizeWords(currentCampus?.name || "Campus")}
          </span>

          <span
            className={`text-xs text-slate-500 transition-transform duration-300 ${
              openMenu ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>

        <div
          className={`absolute right-0 mt-4 w-52 max-w-[90vw] rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-2xl transform transition-all duration-300 ${
            openMenu
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="rounded-t-2xl border-b border-slate-200 px-3 py-3 sm:px-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Signed in as
            </p>
            <p className="mt-1 break-words font-semibold text-slate-900">
              {capitalizeWords(currentCampus?.name || "Campus")}
            </p>
            <button
              onClick={() => {
                setOpenMenu(false);
                router.push("/campus/profile");
              }}
              className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Edit Profile
            </button>
          </div>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/campus");
            }}
            className="w-full px-3 py-2 text-left transition hover:bg-slate-50 sm:px-5 sm:py-3"
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/campus/students");
            }}
            className="w-full px-3 py-2 text-left transition hover:bg-slate-50 sm:px-5 sm:py-3"
          >
            Student List
          </button>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/campus/scan");
            }}
            className="w-full px-3 py-2 text-left transition hover:bg-slate-50 sm:px-5 sm:py-3"
          >
            Scan
          </button>

          <div className="my-1 border-t border-slate-200" />

          <button
            onClick={handleLogoutClick}
            className="w-full rounded-b-2xl px-3 py-2 text-left transition hover:bg-slate-50 sm:px-5 sm:py-3"
          >
            Logout
          </button>
        </div>
        <ConfirmModal
          open={showLogoutModal}
          position={{ top: "3rem", right: 0 }}
          title="Logout Confirmation"
          message="Are you sure you want to logout?"
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
        />
      </div>
    </header>
  );
}
