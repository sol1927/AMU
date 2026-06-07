"use client";

import { React, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CampusNavbar from "../../components/CampusNavbar";
import { useCampus } from "../../context/CampusContext";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusProfilePage() {
  const router = useRouter();
  const { currentCampus, refreshCampus, loading: campusLoading } = useCampus();

  const [savingChanges, setSavingChanges] = useState(false);
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

  const [newEmail, setNewEmail] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!currentCampus) return;
    setLocation(currentCampus.location || "");
    setEmail(currentCampus.email || "");
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

      setMessage(getApiMessage(dataProfile, "Profile updated successfully!"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (refreshCampus) {
        await refreshCampus();
      }

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
      newEmail.toLowerCase() === String(currentCampus?.email || "").toLowerCase()
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
      setEmailMessage("Email updated successfully!");
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
    return null;
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell min-h-screen px-4 pb-10 pt-24 md:px-20">
        <div className="mx-auto max-w-3xl">
          <div className="surface-panel rounded-3xl p-6 shadow-xl">
            <h1 className="mb-4 text-center text-xl font-bold md:text-2xl">
              Edit Profile
            </h1>

            <div className="relative mb-6 flex flex-col items-center">
              <div className="relative h-20 w-20">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/20 shadow-lg transition-shadow duration-300 hover:shadow-blue-500/50">
                  {currentCampus?.logo?.url ? (
                    <Image
                      src={currentCampus.logo.url}
                      alt="Logo"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-300 text-xl font-bold text-white">
                      {currentCampus?.name?.charAt(0) || "C"}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 max-w-full px-4 text-center">
                <p className="break-words text-base font-semibold text-[var(--app-text)]">
                  {currentCampus?.name || "Campus"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--app-text-soft)]">
                  Campus account
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div>
                  <h3 className="mb-2 border-b border-slate-100 pb-2 text-base font-bold text-inherit dark:border-slate-800">
                    Profile Information
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Campus location"
                        className="field-surface w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

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
                      className="field-surface w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-yellow-500"
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

                <div className="grid gap-4 sm:grid-cols-2">
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
                        className="field-surface w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-blue-500"
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
                        className="field-surface w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-blue-500"
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
                  <p className="text-xs font-semibold text-green-500">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingChanges}
                  className="w-full rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white transition shadow-lg shadow-blue-500/10 hover:bg-blue-700 disabled:opacity-55"
                >
                  {savingChanges ? "Saving..." : "Save Changes"}
                </button>
              </form>

              <div className="space-y-4">
                <h3 className="mb-2 border-b border-slate-100 pb-2 text-base font-bold text-inherit dark:border-slate-800">
                  Change Email Address
                </h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  Changing your email address requires verifying your ownership
                  of the new email via a one-time passcode (OTP).
                </p>
                <p className="text-xs italic text-slate-400">
                  Current email:{" "}
                  <span className="font-semibold text-inherit">{email}</span>
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
                      className="field-surface flex-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
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
                      <strong className="font-semibold text-inherit">
                        {newEmail}
                      </strong>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="e.g. 123456"
                        className="field-surface flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold tracking-widest outline-none focus:border-blue-500"
                        required
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                      >
                        Verify & Update
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOtpField(false)}
                      className="block text-xs font-semibold text-blue-500 underline"
                    >
                      Change target email
                    </button>
                  </form>
                )}

                {emailError && (
                  <p className="text-xs font-semibold text-red-500">
                    {emailError}
                  </p>
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
      </div>
    </>
  );
}
