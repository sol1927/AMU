"use client";

import ConfirmModal from "./ConfirmModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCampus } from "../context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusNavbar() {
  const router = useRouter();
  const { currentCampus } = useCampus();
  const [openMenu, setOpenMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown if clicked outside
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
    await fetch(`${url}/campus/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.replace("/"); // redirect to landing page
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center shadow-lg">
      {/* LEFT: Static Website Name */}
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => router.push("/campus")}
      >
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="rounded-full object-cover group-hover:scale-105 transition-transform"
          priority
        />
        <span className="text-xl font-bold text-white tracking-wide">
          Uni<span className="text-blue-500">Cafeteria</span>
        </span>
      </div>

      {/* RIGHT: Campus Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-all duration-300"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-500/40">
            {currentCampus?.logo?.url ? (
              <Image
                src={currentCampus.logo.url}
                alt="Campus Logo"
                width={36}
                height={36}
                className="object-cover w-full h-full rounded-full"
                priority
              />
            ) : (
              <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center rounded-full font-bold">
                {currentCampus?.name?.charAt(0) || "C"}
              </div>
            )}
          </div>

          <span className="font-medium text-white max-w-[120px] truncate">
            {currentCampus?.name || "Campus"}
          </span>

          <span
            className={`text-xs text-white transition-transform duration-300 ${
              openMenu ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>

        {/* DROPDOWN */}
        <div
          className={`absolute right-0 mt-4 w-52 bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow-2xl transform transition-all duration-300 ${
            openMenu
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/campus");
            }}
            className="w-full px-5 py-3 text-left hover:bg-white/10 rounded-t-2xl transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/campus/students");
            }}
            className="w-full px-5 py-3 text-left hover:bg-white/10 transition"
          >
            Student List
          </button>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/campus/scan");
            }}
            className="w-full px-5 py-3 text-left hover:bg-white/10 transition"
          >
            Scan
          </button>

          <div className="border-t border-white/10 my-1" />

          <button
            onClick={handleLogoutClick}
            className="w-full px-5 py-3 text-left text-red-400 hover:bg-red-500/10 rounded-b-2xl transition"
          >
            Logout
          </button>
        </div>

        {/* LOGOUT CONFIRM MODAL */}
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
