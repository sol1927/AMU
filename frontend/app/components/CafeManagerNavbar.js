"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";
import ThemeToggle from "./ThemeToggle";
import ConfirmModal from "./ConfirmModal";
import { HiOutlineLogout, HiOutlineUserCircle } from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CafeManagerNavbar() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useUser();
  const [openMenu, setOpenMenu] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const menuRef = React.useRef(null);

  const brandLogo = currentUser?.logo?.url || "/logo.png";

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
    const res = await fetch(`${url}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      setCurrentUser(null);
      window.location.replace("/");
    }
  };

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
        <button
          type="button"
          onClick={() => router.push("/cafe-manager/dashboard")}
          className="flex items-center gap-3 transition hover:opacity-90"
        >
          <Image
            src={brandLogo}
            alt="GibiGebeta"
            width={44}
            height={44}
            className="rounded-full object-cover"
            priority
            unoptimized
          />
          <div className="text-left">
            <span className="block text-xl font-semibold tracking-tight text-slate-900">
              Gibi<span className="text-blue-500">Gebeta</span>
            </span>
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Cafe Manager
            </span>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => !prev)}
              aria-expanded={openMenu}
              aria-haspopup="true"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200">
                {currentUser?.logo?.url ? (
                  <Image
                    src={currentUser.logo.url}
                    alt="Profile"
                    width={36}
                    height={36}
                    className="h-full w-full rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <HiOutlineUserCircle className="h-7 w-7" />
                )}
              </div>
              <span
                title={currentUser?.displayName || currentUser?.name || "Cafe Manager"}
                className="hidden max-w-[150px] truncate font-medium text-slate-700 sm:inline-block"
              >
                {currentUser?.displayName || currentUser?.name || "Cafe Manager"}
              </span>
              <span
                className={`text-xs text-slate-500 transition-transform duration-300 ${openMenu ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>
            <div
              className={`absolute right-0 mt-4 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-2xl transition-all duration-200 ${openMenu ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"}`}
              role="menu"
              aria-label="Cafe manager menu"
            >
              <div className="bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700">
                    {currentUser?.logo?.url ? (
                      <Image
                        src={currentUser.logo.url}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="h-full w-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <HiOutlineUserCircle className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      title={currentUser?.displayName || currentUser?.name || "Cafe Manager"}
                      className="truncate text-sm font-semibold text-slate-900"
                    >
                      {currentUser?.displayName || currentUser?.name || "Cafe Manager"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Signed in as cafe manager
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(false);
                    router.push("/cafe-manager/profile");
                  }}
                  className="mt-4 inline-flex rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Edit profile
                </button>
              </div>
              <div className="space-y-1 px-2 py-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setOpenMenu(false);
                    router.push("/cafe-manager/dashboard");
                  }}
                >
                  <span className="text-sm font-medium">Dashboard</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setOpenMenu(false);
                    router.push("/cafe-manager/students");
                  }}
                >
                  <span className="text-sm font-medium">Students</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setOpenMenu(false);
                    router.push("/cafe-manager/cafes");
                  }}
                >
                  <span className="text-sm font-medium">Cafes</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setOpenMenu(false);
                    router.push("/cafe-manager/meals");
                  }}
                >
                  <span className="text-sm font-medium">Meals</span>
                </button>
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-red-600 transition hover:bg-red-50"
                  onClick={handleLogoutClick}
                >
                  <HiOutlineLogout className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Logout Confirmation"
        message="Are you sure you want to logout?"
      />
    </header>
  );
}
