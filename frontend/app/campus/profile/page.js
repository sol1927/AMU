"use client";

import { React, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCampus } from "../../context/CampusContext";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import CampusNavbar from "../../components/CampusNavbar";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusProfilePage() {
  const router = useRouter();
  const { currentCampus, refreshCampus, loading: campusLoading } = useCampus();

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
  const [syncing, setSyncing] = useState(false);
  // Email Change state
  const [newEmail, setNewEmail] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const handleSyncStudents = async () => {
    setSyncing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${url}/campus/students/sync`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getApiMessage(data, "Could not sync students."));
      }
      setMessage(getApiMessage(data, "Students synced successfully!"));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err, "Could not sync students."));
      setTimeout(() => setError(""), 3000);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (currentCampus) {
      setName(currentCampus.name || "");
      setLocation(currentCampus.location || "");
      setEmail(currentCampus.email || "");
    }
  }, [currentCampus]);

  useEffect(() => {
    if (!campusLoading && !currentCampus) {
      router.replace("/");
    }
  }, [campusLoading, currentCampus, router]);

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSavingChanges(true);
    setMessage("");
    setError("");

    if (newPassword) {
      if (!currentPassword) {
        setError("Current password is required to set a new password.");
        setSavingChanges(false);
        setTimeout(() => setError(""), 3000);
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        setSavingChanges(false);
        setTimeout(() => setError(""), 3000);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        setSavingChanges(false);
        setTimeout(() => setError(""), 3000);
        return;
      }
    }

    try {
      const updateData = { location };
      if (newPassword) {
        updateData.password = newPassword;
        updateData.currentPassword = currentPassword;
      }

      const resProfile = await fetch(`${url}/campus/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const dataProfile = await resProfile.json();

      if (!resProfile.ok) {
        throw new Error(
          getApiMessage(dataProfile, "We could not save your campus changes."),
        );
      }

      setMessage(
        getApiMessage(
          dataProfile,
          "Profile updated successfully!"
        ),
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError(getErrorMessage(err, "We could not save your campus changes."));
      setTimeout(() => setError(""), 3000);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setEmailMessage("");
    setEmailError("");

    if (
      !newEmail ||
      newEmail.toLowerCase() === currentCampus.email.toLowerCase()
    ) {
      setEmailError("Please enter a new email address.");
      return;
    }

    try {
      const res = await fetch(`${url}/campus/profile/email/request-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getApiMessage(data, "Could not send OTP."));
      }
      setEmailMessage("OTP sent to your new email address.");
      setShowOtpField(true);
    } catch (err) {
      setEmailError(getErrorMessage(err, "OTP request failed."));
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setEmailMessage("");
    setEmailError("");

    try {
      const res = await fetch(`${url}/campus/profile/email/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getApiMessage(data, "Invalid or expired OTP."));
      }
      setEmailMessage(
        "Email updated successfully!",
      );
      setShowOtpField(false);
      setNewEmail("");
      setOtp("");
      if (refreshCampus) {
        await refreshCampus();
      }
      setTimeout(() => setEmailMessage(""), 5000);
    } catch (err) {
      setEmailError(getErrorMessage(err, "OTP verification failed."));
    }
  };

  if (campusLoading || !currentCampus) {
    return (
      <div className="page-shell p-10 pt-28 text-slate-500">Loading...</div>
    );
  }

  return (
    <div className="page-shell flex min-h-screen flex-col overflow-y-auto pb-10">
      <CampusNavbar />

      <main className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="surface-panel w-full max-w-md scale-95 rounded-2xl p-5 sm:scale-100">


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
            <div className="mt-2 max-w-full px-4 text-center">
              <h2 className="break-words text-lg font-bold text-slate-900">
                {name || currentCampus?.name || "Campus"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Campus profile</p>
            </div>
          </div>

          <form onSubmit={handleSaveChanges} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="ml-1 text-[10px] uppercase tracking-wider text-slate-400">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  disabled={true}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-3 py-1.5 outline-none text-slate-500 dark:bg-slate-950 text-sm opacity-60 cursor-not-allowed"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="ml-1 text-[10px] uppercase tracking-wider text-slate-400">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="field-surface w-full rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
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
                  className="w-full rounded-lg border border-yellow-200 bg-white px-3 py-1.5 pr-10 text-sm text-slate-900 outline-none focus:border-yellow-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                <label className="ml-1 text-[10px] uppercase tracking-wider text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field-surface w-full rounded-lg px-3 py-1.5 pr-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
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
                <label className="ml-1 text-[10px] uppercase tracking-wider text-slate-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field-surface w-full rounded-lg px-3 py-1.5 pr-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
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

          {/* Email change separate verification flow */}
          <div className="mt-4 border-t border-slate-700/30 pt-4 space-y-3">
            <div className="text-left">
              <h3 className="text-xs font-semibold text-slate-800">
                Change Email Address
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal text-left">
                Changing your email address requires verifying your ownership of
                the new email via a one-time passcode (OTP).
              </p>
              <p className="text-[10px] text-slate-400 italic mt-0.5 text-left">
                Current email: {email}
              </p>
            </div>

            {!showOtpField ? (
              <form onSubmit={handleRequestOtp} className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white px-3 py-1.5 outline-none focus:border-blue-500 dark:bg-white text-xs"
                  required
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold px-3 rounded-lg text-xs transition"
                >
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-2">
                <div className="text-[10px] text-slate-500 text-left">
                  Enter the 6-digit OTP code sent to{" "}
                  <strong className="text-slate-800 dark:text-white">
                    {newEmail}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white px-3 py-1.5 outline-none focus:border-blue-500 dark:bg-white text-xs text-center font-bold tracking-widest"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 rounded-lg text-xs transition"
                  >
                    Verify & Update Email
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpField(false)}
                  className="text-[10px] text-blue-500 font-semibold underline block text-left"
                >
                  Change target email
                </button>
              </form>
            )}

            {emailError && (
              <p className="text-red-500 text-[10px] font-semibold text-center">
                {emailError}
              </p>
            )}
            {emailMessage && (
              <p className="text-green-500 text-[10px] font-semibold text-center">
                {emailMessage}
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-slate-700/30 pt-4">
            <h3 className="text-xs font-semibold text-slate-800 mb-1">
              Synchronize Student Roster
            </h3>
            <p className="text-[10px] text-slate-500 mb-2 text-left">
              Import latest student records and cafe assignments from the
              external university registry.
            </p>
            <button
              type="button"
              onClick={handleSyncStudents}
              disabled={syncing}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Fetch Students"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
