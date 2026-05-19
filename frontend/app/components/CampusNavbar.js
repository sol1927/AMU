"use client";

import ConfirmModal from "./ConfirmModal";
import CafeNumberModal from "./CafeNumberModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { React, useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useCampus } from "../context/CampusContext";
import { capitalizeWords } from "../utils/stringUtils";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusNavbar() {
  const router = useRouter();
  const { currentCampus, setCurrentCampus, selectCafeNumber } = useCampus();
  const [openMenu, setOpenMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCafeModal, setShowCafeModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
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

    try {
      const res = await fetch(`${url}/campus/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setCurrentCampus(null);
        window.location.replace("/");
      }
    } catch {
      setShowLogoutModal(false);
    }
  };

  const handleCafeSelection = async (cafeNumber) => {
    await selectCafeNumber(cafeNumber);
    setShowCafeModal(false);
    setOpenMenu(false);
    return null;
  };

  const shouldLockCafeSelection = Boolean(
    currentCampus && !currentCampus.selectedCafeNumber,
  );

  return (
    <>
      <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div
          className="flex cursor-pointer items-center gap-3 group"
          onClick={() => router.push("/campus")}
        >
          <Image
            src="/logo.png"
            alt="GibiGebeta"
            width={40}
            height={40}
            className="rounded-full object-cover transition-transform group-hover:scale-105"
            priority
          />
          <span className="text-xl font-bold tracking-wide text-slate-900">
            Gibi<span className="text-blue-500">Gebeta</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentCampus?.selectedCafeNumber ? (
            <button
              type="button"
              onClick={() => setShowCafeModal(true)}
              className="hidden rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 transition hover:bg-cyan-100 md:inline-flex"
            >
              Cafe {currentCampus.selectedCafeNumber}
            </button>
          ) : null}

          <ThemeToggle />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu((prev) => !prev)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 hover:bg-slate-100"
            >
              <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-blue-500/40">
                {currentCampus?.logo?.url ? (
                  <Image
                    src={currentCampus.logo.url}
                    alt="Campus"
                    width={36}
                    height={36}
                    className="h-full w-full rounded-full object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    {capitalizeWords(currentCampus?.name?.charAt(0) || "C")}
                  </div>
                )}
              </div>

              <div className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[120px] truncate font-medium text-slate-700">
                  {capitalizeWords(currentCampus?.name || "Campus")}
                </span>
                {currentCampus?.selectedCafeNumber ? (
                  <span className="block text-xs text-cyan-600">
                    Cafe {currentCampus.selectedCafeNumber}
                  </span>
                ) : null}
              </div>

              <span
                className={`text-xs text-slate-500 transition-transform duration-300 ${
                  openMenu ? "rotate-180" : ""
                }`}
              >
                v
              </span>
            </button>

            <div
              className={`absolute right-0 mt-4 w-52 max-w-[90vw] rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-2xl transition-all duration-300 ${
                openMenu
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              <div className="rounded-t-2xl border-b border-slate-200 px-3 py-3 sm:px-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Signed in as
                </p>
                <p className="mt-1 break-words font-semibold text-slate-900">
                  {capitalizeWords(currentCampus?.name || "Campus")}
                </p>
                {currentCampus?.selectedCafeNumber ? (
                  <p className="mt-1 text-sm text-cyan-600">
                    Cafe {currentCampus.selectedCafeNumber}
                  </p>
                ) : null}
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

              <button
                onClick={() => {
                  setOpenMenu(false);
                  setShowCafeModal(true);
                }}
                className="w-full px-3 py-2 text-left transition hover:bg-slate-50 sm:px-5 sm:py-3"
              >
                Change Cafe
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
        </div>
      </header>

      <CafeNumberModal
        open={showCafeModal || shouldLockCafeSelection}
        locked={shouldLockCafeSelection}
        campusName={capitalizeWords(currentCampus?.name || "Campus")}
        cafeNumbers={currentCampus?.cafeNumbers || [1]}
        selectedCafeNumber={currentCampus?.selectedCafeNumber || ""}
        onSubmit={handleCafeSelection}
        onClose={() => setShowCafeModal(false)}
      />
    </>
  );
}
