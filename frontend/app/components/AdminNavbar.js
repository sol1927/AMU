"use client";

import ConfirmModal from "./ConfirmModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser } from "../context/UserContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function AdminNavbar() {
  const router = useRouter();
  const { currentUser } = useUser();
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
    setOpenMenu(false); // close dropdown
    setShowLogoutModal(true); // show modal
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await fetch(`${url}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.replace("/");
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-slate-800 px-6 py-4 flex justify-between items-center shadow">
      {/* LEFT: Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => router.push("/dashboard")}
      >
        <Image
          src="/logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="rounded-full object-cover"
          priority
        />
        <span className="text-lg font-semibold text-white">Website Name</span>
      </div>

      {/* RIGHT: User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className="flex items-center gap-2 text-white hover:opacity-90"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden">
            {currentUser?.logo?.url ? (
              <Image
                src={currentUser.logo.url}
                alt="Profile"
                width={32}
                height={32}
                className="object-cover w-full h-full rounded-full"
                priority
              />
            ) : (
              <div className="w-full h-full bg-white text-slate-800 flex items-center justify-center rounded-full font-bold">
                {currentUser?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <span className="font-medium">{currentUser?.name || "User"}</span>
          <span
            className={`text-xs transition-transform duration-200 ${openMenu ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>

        {/* DROPDOWN */}
        <div
          className={`absolute right-0 mt-3 w-48 bg-white text-gray-800 border shadow-lg
            rounded-xl overflow-hidden transform transition-all duration-300
            ${openMenu ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
        >
          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/dashboard");
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/dashboard/campuses");
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
          >
            Campuses
          </button>

          <button
            onClick={() => {
              setOpenMenu(false);
              router.push("/dashboard/profile");
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100"
          >
            Edit Profile
          </button>

          <div className="border-t" />

          <button
            onClick={handleLogoutClick}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>

        {/* SEPARATE LOGOUT CONFIRM MODAL */}
        <ConfirmModal
          open={showLogoutModal}
          position={{ top: "3rem", right: 0 }} // next to dropdown
          title="Logout Confirmation"
          message="Are you sure you want to logout?"
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
        />
      </div>
    </header>
  );
}
