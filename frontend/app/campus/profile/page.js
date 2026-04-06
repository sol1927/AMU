"use client";

import { React, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCampus } from "../../context/CampusContext";
import { IoChevronBackSharp } from "react-icons/io5";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import CampusNavbar from "../../components/CampusNavbar";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusProfilePage() {
  const router = useRouter();
  const { currentCampus, setCurrentCampus } = useCampus();

  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentCampus) {
      setName(currentCampus.name || "");
      setLocation(currentCampus.location || "");
      setEmail(currentCampus.email || "");
      setLoading(false);
    }
  }, [currentCampus]);

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSavingChanges(true);
    setMessage("");
    setError("");

    if (newPassword) {
      if (!currentPassword) {
        setError("Current password is required to set a new password.");
        setSavingChanges(false);
        setTimeout(() => setError(""), 2000);
        return;
      }
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        setSavingChanges(false);
        setTimeout(() => setError(""), 2000);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        setSavingChanges(false);
        setTimeout(() => setError(""), 2000);
        return;
      }
    }

    try {
      const updateData = { name, location, email };
      if (newPassword) {
        updateData.password = newPassword;
        updateData.currentPassword = currentPassword;
      }

      const resProfile = await fetch(
        `${url}/dashboard/campuses/selfUpdate/${currentCampus._id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );

      const dataProfile = await resProfile.json();

      if (!resProfile.ok) {
        throw new Error(dataProfile.message || "Update failed");
      }

      setCurrentCampus(dataProfile.campus);
      setMessage("Profile updated successfully!");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setTimeout(() => setError(""), 2000);
    } finally {
      setSavingChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-gray-500 p-10">Loading...</div>
    );
  }

  return (
    <div className="h-screen overflow-hidden text-white flex flex-col">
      <CampusNavbar />

      <main className="flex-1 flex items-center justify-center p-4 pt-20">
        <button
          onClick={() => router.push("/campus")}
          className="fixed top-24 left-6 z-20 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-all"
        >
          <IoChevronBackSharp size={20} />
        </button>

        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-2xl scale-95 sm:scale-100">
          <div className="flex flex-col items-center mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg mb-2">
              {currentCampus?.logo?.url ? (
                <Image
                  src={currentCampus.logo.url}
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center font-bold text-2xl">
                  {name?.charAt(0)}
                </div>
              )}
            </div>
            <h2 className="text-lg font-bold">Campus Profile</h2>
          </div>

          <form onSubmit={handleSaveChanges} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider ml-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider ml-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider ml-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>

            <div className="pt-2">
              <label className="text-[10px] text-yellow-500 uppercase tracking-wider ml-1">
                Current Password (required to change password)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-yellow-500/20 rounded-lg px-3 py-1.5 text-sm pr-10 outline-none focus:border-yellow-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
                >
                  {showCurrentPass ? (
                    <AiOutlineEyeInvisible size={16} />
                  ) : (
                    <AiOutlineEye size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider ml-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
                  >
                    {showNewPass ? (
                      <AiOutlineEyeInvisible size={14} />
                    ) : (
                      <AiOutlineEye size={14} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
                  >
                    {showConfirmPass ? (
                      <AiOutlineEyeInvisible size={14} />
                    ) : (
                      <AiOutlineEye size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="h-4 flex items-center justify-center">
              {message && (
                <p className="text-green-400 text-[11px] text-center">
                  {message}
                </p>
              )}
              {error && (
                <p className="text-red-400 text-[11px] text-center">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={savingChanges}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-50 mt-2"
            >
              {savingChanges ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
