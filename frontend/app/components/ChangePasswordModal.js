"use client";
import { React, useState, useEffect, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useUser } from "../context/UserContext";
import PropTypes from "prop-types";
import {
  getFriendlyMessage,
  getRequestErrorMessage,
} from "../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function ChangePasswordModal({ onClose }) {
  const { refreshUser } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const rulesRef = useRef(null);

  const rules = {
    length: (pw) => pw.length >= 8,
    uppercase: (pw) => /[A-Z]/.test(pw),
    lowercase: (pw) => /[a-z]/.test(pw),
    number: (pw) => /\d/.test(pw),
    special: (pw) => /[@$!%*?&]/.test(pw),
  };
  const status = Object.fromEntries(
    Object.entries(rules).map(([k, fn]) => [k, fn(newPassword)]),
  );
  const allValid = Object.values(status).every(Boolean);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rulesRef.current && !rulesRef.current.contains(e.target)) {
        setShowRules(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!allValid) {
      setError("Password does not meet all requirements");
      setShowRules(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setShowRules(true);
      return;
    }

    if (!currentPassword) {
      setError("Enter your current password to update");
      return;
    }

    try {
      const res = await fetch(`${url}/profile/me/password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getFriendlyMessage(
            data.message,
            "We could not change your password. Please try again.",
          ),
          data.message || "Failed to change password. Try again.",
        );
      }

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowRules(false);
      if (refreshUser) {
        await refreshUser();
      }
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(
        err?.message ||
          getRequestErrorMessage(
            err,
            "We could not change your password. Please try again.",
          ),
        err?.message || "Failed to change password. Try again.",
      );
    }
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="modal-panel flex w-full max-w-xs flex-col gap-4 rounded-2xl p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center text-lg font-semibold text-slate-900">
          Change Password
        </h3>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="modal-input w-full rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          >
            {showCurrent ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onFocus={() => setShowRules(true)}
            className="modal-input w-full rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          >
            {showNew ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="modal-input w-full rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          >
            {showConfirm ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>
        {showRules && !allValid && (
          <div
            ref={rulesRef}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
          >
            <p className="font-semibold mb-1">Password must include:</p>
            <ul className="space-y-1">
              <li className={status.length ? "text-green-400" : "text-red-500"}>
                {status.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li
                className={status.uppercase ? "text-green-400" : "text-red-500"}
              >
                {status.uppercase ? "✅" : "❌"} One uppercase letter
              </li>
              <li
                className={status.lowercase ? "text-green-400" : "text-red-500"}
              >
                {status.lowercase ? "✅" : "❌"} One lowercase letter
              </li>
              <li className={status.number ? "text-green-400" : "text-red-500"}>
                {status.number ? "✅" : "❌"} One number
              </li>
              <li
                className={status.special ? "text-green-400" : "text-red-500"}
              >
                {status.special ? "✅" : "❌"} One special character (@$!%*?&)
              </li>
            </ul>
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && (
          <p className="text-green-400 text-sm text-center">{success}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            Submit
          </button>
        </div>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease forwards;
        }
      `}</style>
    </div>
  );
}

ChangePasswordModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};
