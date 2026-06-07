"use client";

import { React, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "../../context/UserContext";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CafeProfilePage() {
  const router = useRouter();
  const { currentUser, refreshUser } = useUser();

  const [savingChanges, setSavingChanges] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Email Change state
  const [newEmail, setNewEmail] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || "");
    setDisplayName(currentUser.displayName || "");
  }, [currentUser]);

  useEffect(() => {
    if (currentUser === null) {
      router.replace("/");
    }
  }, [currentUser, router]);

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
      // 1. Update Name if changed
      if (name !== currentUser.name) {
        const resName = await fetch(`${url}/profile/me`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, displayName }),
        });
        const dataName = await resName.json();
        if (!resName.ok) {
          throw new Error(getApiMessage(dataName, "Name update failed."));
        }
      }

      // 2. Update Password if specified
      if (newPassword) {
        const resPass = await fetch(`${url}/profile/me/password`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const dataPass = await resPass.json();
        if (!resPass.ok) {
          throw new Error(getApiMessage(dataPass, "Password update failed."));
        }
      }

      setMessage(
        currentUser.role === "cafe manager"
          ? "Profile updated successfully!"
          : "Changes submitted successfully! Awaiting Campus approval.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (currentUser.role === "cafe manager" && refreshUser) {
        await refreshUser();
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save profile changes."));
      setTimeout(() => setError(""), 5000);
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
      newEmail.toLowerCase() === currentUser.email.toLowerCase()
    ) {
      setEmailError("Please enter a new email address.");
      return;
    }

    try {
      const res = await fetch(`${url}/profile/me/email/request-otp`, {
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
      const res = await fetch(`${url}/profile/me/email/verify-otp`, {
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
        currentUser.role === "cafe manager"
          ? "Email updated successfully!"
          : "Email update request submitted! Awaiting Campus approval.",
      );
      setShowOtpField(false);
      setNewEmail("");
      setOtp("");
      if (currentUser.role === "cafe manager" && refreshUser) {
        await refreshUser();
      }
      setTimeout(() => setEmailMessage(""), 5000);
    } catch (err) {
      setEmailError(getErrorMessage(err, "OTP verification failed."));
    }
  };

  if (!currentUser) return null;
  return (
    <div className="page-shell fixed inset-0 flex items-start justify-center overflow-y-auto px-4 pt-24 pb-8 md:px-10">
      <div className="surface-panel w-full max-w-3xl max-h-[calc(100vh-12rem)] flex-col rounded-3xl p-4 shadow-xl md:p-6">
        <h1 className="mb-2 text-center text-xl font-bold md:text-2xl">
          Edit Profile
        </h1>

        <div className="relative mb-3 flex flex-col items-center">
          <div className="relative h-20 w-20">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/20 shadow-lg transition-shadow duration-300 hover:shadow-blue-500/50">
              {currentUser?.campus?.logo?.url || currentUser?.logo?.url ? (
                <Image
                  src={currentUser?.campus?.logo?.url || currentUser.logo.url}
                  alt="Logo"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 font-bold text-white text-xl">
                  {name?.charAt(0) || "C"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 max-w-full px-4 text-center">
            <p className="break-words text-base font-semibold text-[var(--app-text)]">
              {currentUser.displayName || currentUser.name}
            </p>
            <p className="mt-0.5 text-xs text-[var(--app-text-soft)]">
              Cafe manager account
            </p>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 overflow-hidden md:grid-cols-2">
          {/* Left Column - Password Form */}
          <form
            onSubmit={handleSaveChanges}
            className="space-y-3 overflow-hidden"
          >
            <h3 className="mb-2 border-b border-slate-100 pb-2 text-base font-bold text-inherit dark:border-slate-800">
              Update Password
            </h3>

            <div>
              <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-yellow-600">
                Current Password (required to change password)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-yellow-200/50 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-yellow-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrentPass ? (
                    <AiOutlineEyeInvisible size={18} />
                  ) : (
                    <AiOutlineEye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-4 py-2.5 pr-10 text-sm dark:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showNewPass ? (
                      <AiOutlineEyeInvisible size={18} />
                    ) : (
                      <AiOutlineEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-4 py-2.5 pr-10 text-sm dark:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showConfirmPass ? (
                      <AiOutlineEyeInvisible size={18} />
                    ) : (
                      <AiOutlineEye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs font-semibold text-red-500">{error}</p>
            )}
            {message && (
              <p className="text-xs font-semibold text-green-500">{message}</p>
            )}

            <button
              type="submit"
              disabled={savingChanges}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-2xl text-sm transition shadow-lg shadow-blue-500/10 disabled:opacity-55"
            >
              {savingChanges ? "Saving..." : "Save Password Changes"}
            </button>
          </form>

          {/* Right Column - Email change separate verification flow */}
          <div className="space-y-3 overflow-hidden">
            <h3 className="mb-2 border-b border-slate-100 pb-2 text-base font-bold text-inherit dark:border-slate-800">
              Change Email Address
            </h3>
            <p className="text-xs leading-relaxed text-slate-500">
              Changing your email address requires verifying your ownership of
              the new email via a one-time passcode (OTP).
            </p>
            <p className="text-xs text-slate-400 italic">
              Current email:{" "}
              <span className="font-semibold text-inherit">
                {currentUser.email}
              </span>
            </p>

            {!showOtpField ? (
              <form
                onSubmit={handleRequestOtp}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-4 py-2.5 outline-none focus:border-blue-500 dark:bg-white text-sm"
                  required
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="text-xs text-slate-500">
                  Enter the 6-digit OTP code sent to{" "}
                  <strong className="text-inherit font-semibold">
                    {newEmail}
                  </strong>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-4 py-2.5 outline-none focus:border-blue-500 dark:bg-white text-sm text-center font-bold tracking-widest"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shrink-0"
                  >
                    {currentUser.role === "cafe manager"
                      ? "Verify & Update"
                      : "Verify & Submit"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpField(false)}
                  className="text-xs text-blue-500 font-semibold underline block"
                >
                  Change target email
                </button>
              </form>
            )}

            {emailError && (
              <p className="text-xs font-semibold text-red-500">{emailError}</p>
            )}
            {emailMessage && (
              <p className="text-xs font-semibold text-green-500">
                {emailMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
