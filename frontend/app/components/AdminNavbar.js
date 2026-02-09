"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";

export default function AdminNavbar() {
  const router = useRouter();
  const { currentUser } = useUser(); // ✅ reactive user context
  const [openMenu, setOpenMenu] = useState(false);
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

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
  };

  return (
    <header className="bg-slate-800 px-6 py-4 flex justify-between items-center shadow">
      {/* LEFT */}
      <div className="flex items-center gap-2 text-white">
        <div className="w-9 h-9 bg-white text-slate-800 flex items-center justify-center rounded-full font-bold">
          W
        </div>
        <span className="text-lg font-semibold">Website Name</span>
      </div>

      {/* RIGHT */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className="flex items-center gap-2 text-white hover:opacity-90"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden">
            {currentUser?.logo ? (
              <Image
                src={currentUser.logo}
                alt="Profile"
                width={32}
                height={32}
                className="object-cover w-full h-full"
                priority
              />
            ) : (
              <div className="w-full h-full bg-white text-slate-800 flex items-center justify-center font-bold">
                {currentUser?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <span className="font-medium">{currentUser?.name || "User"}</span>
          <span
            className={`text-xs transition-transform duration-200 ${
              openMenu ? "rotate-180" : ""
            }`}
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
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
