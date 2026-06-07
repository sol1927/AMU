"use client";

import React from "react";
import PropTypes from "prop-types";
import ConfirmModal from "./ConfirmModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useUser } from "../context/UserContext";
import { capitalizeWords } from "../utils/stringUtils";
import {
  HiOutlineViewGrid,
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineUserCircle,
} from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

const NavbarItem = ({ icon: Icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50 ${danger ? "text-red-500 hover:bg-red-50" : "text-slate-700"
      }`}
  >
    <Icon className={`h-5 w-5 ${danger ? "text-red-500" : "text-slate-400"}`} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

NavbarItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  danger: PropTypes.bool,
};

export default function AdminNavbar() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useUser();
  const [openMenu, setOpenMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuRef = useRef(null);

  const brandLogo = currentUser?.logo?.url || "/logo.png";

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
    const res = await fetch(`${url}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      setCurrentUser(null);
      window.location.replace("/");
    }
  };

  const menuItems = [
    {
      icon: HiOutlineViewGrid,
      label: "Dashboard",
      onClick: () => router.push("/dashboard"),
    },
    {
      icon: HiOutlineOfficeBuilding,
      label: "Campuses",
      onClick: () => router.push("/dashboard/campuses"),
    },
    {
      icon: HiOutlineUsers,
      label: "Campus Students",
      onClick: () => router.push("/dashboard/students"),
    },
    {
      icon: HiOutlineClipboardList,
      label: "Users",
      onClick: () => router.push("/dashboard/users"),
    },
    {
      icon: HiOutlineClipboardList,
      label: "Meal History",
      onClick: () => router.push("/dashboard/meals"),
    },
    {
      icon: HiOutlineClipboardList,
      label: "Reports",
      onClick: () => router.push("/dashboard/reports"),
    },
    {
      icon: HiOutlineClipboardList,
      label: "Requests",
      onClick: () => router.push("/dashboard/requests"),
    },
  ];

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
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
              Admin console
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
                    priority
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-700">
                    {capitalizeWords(currentUser?.name)?.charAt(0) || "A"}
                  </span>
                )}
              </div>
              <span
                title={capitalizeWords(currentUser?.name) || "Admin"}
                className="hidden max-w-[150px] truncate font-medium text-slate-700 sm:inline-block"
              >
                {capitalizeWords(currentUser?.name) || "Admin"}
              </span>
              <span
                className={`text-xs text-slate-500 transition-transform duration-300 ${openMenu ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>

            <div
              className={`absolute right-0 mt-4 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-2xl transition-all duration-200 ${openMenu
                  ? "opacity-100 scale-100"
                  : "pointer-events-none opacity-0 scale-95"
                }`}
              role="menu"
              aria-label="Admin menu"
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
                        priority
                      />
                    ) : (
                      <HiOutlineUserCircle className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      title={capitalizeWords(currentUser?.name) || "Admin"}
                      className="truncate text-sm font-semibold text-slate-900"
                    >
                      {capitalizeWords(currentUser?.name) || "Admin"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Signed in as admin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(false);
                    router.push("/dashboard/profile");
                  }}
                  className="mt-4 inline-flex rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Edit profile
                </button>
              </div>

              <div className="space-y-1 px-2 py-3">
                {menuItems.map((item) => (
                  <NavbarItem
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => {
                      setOpenMenu(false);
                      item.onClick();
                    }}
                  />
                ))}
              </div>

              <div className="border-t border-slate-200 px-2 py-3">
                <NavbarItem
                  icon={HiOutlineLogout}
                  label="Logout"
                  danger
                  onClick={handleLogoutClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        position={{ top: "3rem", right: 0 }}
        title="Logout Confirmation"
        message="Are you sure you want to logout?"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </header>
  );
}
