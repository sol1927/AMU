"use client";

import { React, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  getFriendlyMessage,
  getRequestErrorMessage,
} from "../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function EmailChangeModal({ onClose, setCurrentUser }) {
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleRequestOtp = async () => {
    if (!newEmail) {
      setError("Enter a new email first");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setError("");
    setSuccess("");
    setIsRequesting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch(`${url}/profile/me/email/request-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getFriendlyMessage(
            data.message,
            "We could not send the code. Please try again.",
          ),
        );
      }

      setSuccess("OTP sent to your new email!");
    } catch (err) {
      clearTimeout(timeoutId);
      setError(
        err?.message ||
          getRequestErrorMessage(
            err,
            "We could not send the code. Please try again.",
          ),
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError("Enter the OTP first");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setError("");
    setSuccess("");
    setIsVerifying(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch(`${url}/profile/me/email/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getFriendlyMessage(
            data.message,
            "We could not verify the code. Please try again.",
          ),
        );
      }

      setSuccess("Email updated successfully!");
      setCurrentUser((prev) => ({ ...prev, email: newEmail }));
      setNewEmail("");
      setOtp("");
      setTimeout(() => onClose(), 500);
    } catch (err) {
      clearTimeout(timeoutId);
      setError(
        err?.message ||
          getRequestErrorMessage(
            err,
            "We could not verify the code. Please try again.",
          ),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div className="modal-panel relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-4 shadow-lg animate-fadeIn sm:w-96">
        {" "}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-700"
        >
          ✕
        </button>
        <h2 className="mb-4 text-center text-xl font-bold text-slate-900">
          Change Email
        </h2>
        {error && (
          <p className="mb-4 p-2 rounded-lg text-center text-sm bg-red-500/20 text-red-400 border border-red-500/30">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 p-2 rounded-lg text-center text-sm bg-green-500/20 text-green-400 border border-green-500/30">
            {success}
          </p>
        )}
        <input
          type="email"
          placeholder="New email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="modal-input mb-3 w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          autoFocus
        />
        <button
          onClick={handleRequestOtp}
          disabled={!newEmail || isRequesting}
          className={`w-full px-4 py-2 rounded-lg font-semibold text-white mb-3 transition ${
            newEmail && !isRequesting
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
              : "bg-slate-200 cursor-not-allowed opacity-50"
          }`}
        >
          {isRequesting ? "Requesting..." : "Request OTP"}
        </button>
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => {
            const value = e.target.value;
            if (/^\d{0,6}$/.test(value)) setOtp(value);
          }}
          maxLength={6}
          className="modal-input mb-3 w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <button
          onClick={handleVerifyOtp}
          disabled={!otp || isVerifying}
          className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition ${
            otp && !isVerifying
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
              : "bg-slate-200 cursor-not-allowed opacity-50"
          }`}
        >
          {isVerifying ? "Verifying..." : "Verify OTP"}
        </button>
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

EmailChangeModal.propTypes = {
  currentEmail: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  setCurrentUser: PropTypes.func.isRequired,
};
