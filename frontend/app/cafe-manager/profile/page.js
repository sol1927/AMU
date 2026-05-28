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
  const { currentUser, setCurrentUser, refreshUser } = useUser();

  const [savingChanges, setSavingChanges] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Pending approvals
  const [pendingApproval, setPendingApproval] = useState(null);

  // Profile photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Email Change state
  const [newEmail, setNewEmail] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const fetchPendingApproval = async () => {
    try {
      const res = await fetch(`${url}/approvals/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPendingApproval(data.pending || null);
      }
    } catch (err) {
      console.error("Failed to fetch pending approval:", err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || "");
    setEmail(currentUser.email || "");
    fetchPendingApproval();
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
          body: JSON.stringify({ name }),
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

      setMessage("Changes submitted successfully! Awaiting Campus approval.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      fetchPendingApproval();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save profile changes."));
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingChanges(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setMessage("");
    setError("");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await fetch(`${url}/profile/me/photo`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(getApiMessage(data, "Photo upload failed."));
        }
        setMessage("Photo update submitted! Awaiting Campus approval.");
        fetchPendingApproval();
        setTimeout(() => setMessage(""), 5000);
      } catch (err) {
        setError(getErrorMessage(err, "Photo upload failed."));
        setTimeout(() => setError(""), 5000);
      } finally {
        setUploadingPhoto(false);
      }
    };
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
        "Email update request submitted! Awaiting Campus approval.",
      );
      setShowOtpField(false);
      setNewEmail("");
      setOtp("");
      fetchPendingApproval();
      setTimeout(() => setEmailMessage(""), 5000);
    } catch (err) {
      setEmailError(getErrorMessage(err, "OTP verification failed."));
    }
  };

  if (!currentUser) return null;
  return (
    <div className="page-shell relative flex min-h-screen items-center justify-center px-6 py-12 pt-28 md:px-20">
      <div className="surface-panel w-full max-w-lg rounded-2xl p-6">
        {pendingApproval && (
          <div className="mb-6 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 text-sm text-amber-800 dark:text-amber-400 flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-bold">Pending Profile Updates</p>
              <p className="text-xs text-slate-500 mt-0.5">
                You have proposed changes waiting for your Campus administrator
                to approve.
              </p>
            </div>
          </div>
        )}

        <h1 className="mb-6 text-center text-2xl font-bold">Edit Profile</h1>

        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative h-28 w-28">
            <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-white/20 shadow-lg transition-shadow duration-300 hover:shadow-blue-500/50">
              {currentUser?.campus?.logo?.url || currentUser?.logo?.url ? (
                <Image
                  src={currentUser?.campus?.logo?.url || currentUser.logo.url}
                  alt="Logo"
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 font-bold text-white">
                  {name?.charAt(0) || "C"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 max-w-full px-4 text-center">
            <p className="break-words text-lg font-semibold text-slate-900 dark:text-white">
              {currentUser.name}
            </p>
            <p className="mt-1 text-sm text-slate-500">Cafeteria account</p>
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleSaveChanges} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-blue-500 dark:bg-slate-950 dark:focus:bg-slate-950 text-sm"
                required
              />
            </div>

            {/* Password overrides */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] uppercase font-bold tracking-wider text-yellow-600 block mb-1.5 ml-1">
                Current Password (required to change password)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-yellow-250/50 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-yellow-500"
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
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5 ml-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-2.5 pr-10 text-sm dark:bg-slate-950"
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
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5 ml-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-2.5 pr-10 text-sm dark:bg-slate-950"
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
              <p className="text-red-500 text-xs font-semibold">{error}</p>
            )}
            {message && (
              <p className="text-green-500 text-xs font-semibold">{message}</p>
            )}

            <button
              type="submit"
              disabled={savingChanges}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-sm transition shadow-lg shadow-blue-500/10 disabled:opacity-55"
            >
              {savingChanges ? "Saving..." : "Save Profile Changes"}
            </button>
          </form>

          {/* Email change separate verification flow */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Change Email Address
              </h3>
              <p className="text-xs text-slate-500">
                Changing your email address requires verifying your ownership of
                the new email via a one-time passcode (OTP).
              </p>
            </div>

            {!showOtpField ? (
              <form onSubmit={handleRequestOtp} className="flex gap-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-blue-500 dark:bg-slate-950 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold px-5 rounded-xl text-sm transition"
                >
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="text-xs text-slate-500">
                  Enter the 6-digit OTP code sent to{" "}
                  <strong className="text-slate-800 dark:text-white">
                    {newEmail}
                  </strong>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-blue-500 dark:bg-slate-950 text-sm text-center font-bold tracking-widest"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl text-sm transition"
                  >
                    Verify & Submit Request
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
              <p className="text-red-500 text-xs font-semibold">{emailError}</p>
            )}
            {emailMessage && (
              <p className="text-green-500 text-xs font-semibold">
                {emailMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
