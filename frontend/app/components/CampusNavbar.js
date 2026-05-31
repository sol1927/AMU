"use client";

import React from "react";
import PropTypes from "prop-types";
import ConfirmModal from "./ConfirmModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useCampus } from "../context/CampusContext";
import { capitalizeWords } from "../utils/stringUtils";
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineSwitchHorizontal,
  HiOutlineLogout,
  HiOutlineUserCircle,
  HiOutlineDocumentText,
} from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

const MenuItem = ({ icon: Icon, label, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-50"
  >
    <span className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-slate-400" />
      <span className="text-sm font-medium">{label}</span>
    </span>
    {badge ? (
      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
        {badge}
      </span>
    ) : null}
  </button>
);

MenuItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  badge: PropTypes.string,
};

export default function CampusNavbar() {
  const router = useRouter();
  const { currentCampus, setCurrentCampus } = useCampus();
  const [openMenu, setOpenMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // const [showCafeModal, setShowCafeModal] = useState(false);
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

  const campusMenuActions = [
    {
      icon: HiOutlineHome,
      label: "Dashboard",
      onClick: () => router.push("/campus"),
    },
    {
      icon: HiOutlineUserGroup,
      label: "Student List",
      onClick: () => router.push("/campus/students"),
    },
    {
      icon: HiOutlineClock,
      label: "Time Controller",
      onClick: () => router.push("/campus/time-controller"),
    },
    {
      icon: HiOutlineSwitchHorizontal,
      label: "Cafes",
      onClick: () => router.push("/campus/cafes"),
    },
    {
      icon: HiOutlineUserCircle,
      label: "Cafe Managers",
      onClick: () => router.push("/campus/cafe-managers"),
    },
    {
      icon: HiOutlineDocumentText,
      label: "Meal History",
      onClick: () => router.push("/campus/meals"),
    },
  ];

  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={() => router.push("/campus")}
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <Image
              src="/logo.png"
              alt="GibiGebeta"
              width={44}
              height={44}
              className="rounded-full object-cover"
              priority
            />
            <div className="text-left">
              <span className="block text-xl font-semibold tracking-tight text-slate-900">
                Gibi<span className="text-blue-500">Gebeta</span>
              </span>
              <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Campus dashboard
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {/* Cafe number badge removed for campus */}

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
                    <span className="text-sm font-semibold text-slate-700">
                      {capitalizeWords(currentCampus?.name?.charAt(0) || "C")}
                    </span>
                  )}
                </div>

                <div className="hidden min-w-0 text-left sm:block">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-none mb-0.5">
                    Welcome
                  </span>
                  <span
                    title={capitalizeWords(currentCampus?.name || "Campus")}
                    className="block max-w-[150px] truncate font-semibold text-slate-700 leading-tight"
                  >
                    {capitalizeWords(currentCampus?.name || "Campus")}
                  </span>
                  {/* Cafe number or 'No cafe selected' removed for campus */}
                </div>

                <span
                  className={`text-xs text-slate-500 transition-transform duration-300 ${openMenu ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </button>

              <div
                className={`absolute right-0 mt-4 w-72 max-w-[90vw] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-2xl transition-all duration-200 ${openMenu
                    ? "opacity-100 scale-100"
                    : "pointer-events-none opacity-0 scale-95"
                  }`}
                role="menu"
                aria-label="Campus menu"
              >
                <div className="bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700">
                      {currentCampus?.logo?.url ? (
                        <Image
                          src={currentCampus.logo.url}
                          alt="Campus"
                          width={40}
                          height={40}
                          className="h-full w-full rounded-full object-cover"
                          priority
                        />
                      ) : (
                        <HiOutlineUserCircle className="h-7 w-7" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        title={`Welcome, ${capitalizeWords(currentCampus?.name || "Campus")}`}
                        className="truncate text-sm font-semibold text-slate-900"
                      >
                        Welcome, {capitalizeWords(currentCampus?.name || "Campus")}
                      </p>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        Campus account
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      router.push("/campus/profile");
                    }}
                    className="mt-4 inline-flex rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Edit profile
                  </button>
                </div>

                <div className="space-y-1 px-2 py-3">
                  {campusMenuActions.map((item) => (
                    <MenuItem
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      onClick={() => {
                        setOpenMenu(false);
                        item.onClick();
                      }}
                    />
                  ))}
                </div>

                <div className="border-t border-slate-200 px-2 py-3">
                  <MenuItem
                    icon={HiOutlineLogout}
                    label="Logout"
                    onClick={handleLogoutClick}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <ConfirmModal
        open={showLogoutModal}
        position={{ top: "3rem", right: 0 }}
        title="Logout Confirmation"
        message="Are you sure you want to logout?"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
