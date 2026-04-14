"use client";

import { React, useState, useEffect, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import PropTypes from "prop-types";
import { getApiMessage, getErrorMessage } from "../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function SetPasswordModal({ show, onClose, onOpenLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);

  const rulesRef = useRef(null);

  const rules = {
    length: (pw) => pw.length >= 8,
    uppercase: (pw) => /[A-Z]/.test(pw),
    lowercase: (pw) => /[a-z]/.test(pw),
    number: (pw) => /\d/.test(pw),
    special: (pw) => /[@$!%*?&]/.test(pw),
  };
  const checkRules = (pw) =>
    Object.fromEntries(Object.entries(rules).map(([k, fn]) => [k, fn(pw)]));
  const status = checkRules(password);
  const allValid = Object.values(status).every(Boolean);

  useEffect(() => {
    if (show) {
      setPassword("");
      setConfirmPassword("");
      setMessage("");
      setMessageType("error");
      setShowPassword(false);
      setShowConfirm(false);
      setShowRules(false);
    }
  }, [show]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [message]);

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
    setMessage("");

    if (!allValid) {
      setMessage("Password does not meet all requirements");
      setShowRules(true);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setShowRules(true);
      return;
    }
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch(`${url}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, confirmPassword }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.ok) {
        setMessageType("success");
        setMessage(
          getApiMessage(data, "Your password has been set successfully."),
        );
        setTimeout(() => {
          onClose();
          onOpenLogin();
        }, 1000);
      } else {
        setMessageType("error");
        setMessage(
          getApiMessage(data, "We could not set your password. Please try again."),
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setMessageType("error");
      setMessage(
        getErrorMessage(error, "We could not set your password. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-start justify-end"
      onClick={onClose}
    >
      <div
        className="modal-panel relative mt-16 mr-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl p-6 transition-all duration-300 sm:mt-20 sm:mr-6 sm:max-w-md sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-center text-2xl font-bold text-slate-900">
          Set Your Password
        </h2>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded text-sm transition-opacity duration-300 ${
              messageType === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {message || "\u00A0"}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowRules(true)}
              className="modal-input w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-lg text-slate-400"
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setShowRules(false)}
              className="modal-input w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-2.5 text-lg text-slate-400"
            >
              {showConfirm ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
          </div>

          {showRules && !allValid && (
            <div
              ref={rulesRef}
              className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <p className="font-semibold mb-2">Password must include:</p>
              <ul className="space-y-1">
                <li
                  className={status.length ? "text-green-400" : "text-red-400"}
                >
                  {status.length ? "✅" : "❌"} At least 8 characters
                </li>
                <li
                  className={
                    status.uppercase ? "text-green-400" : "text-red-400"
                  }
                >
                  {status.uppercase ? "✅" : "❌"} One uppercase letter
                </li>
                <li
                  className={
                    status.lowercase ? "text-green-400" : "text-red-400"
                  }
                >
                  {status.lowercase ? "✅" : "❌"} One lowercase letter
                </li>
                <li
                  className={status.number ? "text-green-400" : "text-red-400"}
                >
                  {status.number ? "✅" : "❌"} One number
                </li>
                <li
                  className={status.special ? "text-green-400" : "text-red-400"}
                >
                  {status.special ? "✅" : "❌"} One special character (@$!%*?&)
                </li>
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-white/10 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
            }`}
          >
            {loading ? "Setting..." : "Set Password"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Remembered your password?{" "}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="text-indigo-400 font-semibold hover:underline"
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

SetPasswordModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenLogin: PropTypes.func.isRequired,
};
