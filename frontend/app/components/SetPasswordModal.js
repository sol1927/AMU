"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function SetPasswordModal({ show, onClose, onOpenLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);

  const rulesRef = useRef(null);
  const router = useRouter();

  // Password rules
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

  // Hide rules dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rulesRef.current && !rulesRef.current.contains(e.target)) {
        if (allValid) setShowRules(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allValid]);

  useEffect(() => {
    if (show) {
      setPassword("");
      setConfirmPassword("");
      setMessage("");
      setShowRules(false);
      setShowPassword(false);
      setShowConfirm(false);
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!allValid) {
      setMessage("Password does not meet all requirements");
      setShowRules(true);
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setShowRules(true);
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${url}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();
      setMessage(data.message);
      setTimeout(() => setMessage(""), 2000);

      if (res.ok) setTimeout(() => router.push("/"), 1500);
    } catch {
      setMessage("Connection error. Please try again.");
      setTimeout(() => setMessage(""), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end items-start"
      onClick={onClose} // close when clicking outside
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mt-20 mr-6 transform transition-all"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h2 className="text-3xl font-extrabold mb-4 text-center text-gray-800">
          Set Your Password
        </h2>

        {message && (
          <p
            className={`mb-4 p-2 text-center rounded ${
              message.toLowerCase().includes("success") ||
              message.toLowerCase().includes("set")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowRules(true)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500 text-sm font-semibold"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-3 text-gray-500 text-sm font-semibold"
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>

          {/* Rules */}
          {showRules && !allValid && (
            <div
              ref={rulesRef}
              className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded text-sm"
            >
              <p className="font-semibold mb-2">Password must include:</p>
              <ul className="space-y-1">
                <li
                  className={status.length ? "text-green-600" : "text-red-600"}
                >
                  {status.length ? "✅" : "❌"} At least 8 characters
                </li>
                <li
                  className={
                    status.uppercase ? "text-green-600" : "text-red-600"
                  }
                >
                  {status.uppercase ? "✅" : "❌"} One uppercase letter (A-Z)
                </li>
                <li
                  className={
                    status.lowercase ? "text-green-600" : "text-red-600"
                  }
                >
                  {status.lowercase ? "✅" : "❌"} One lowercase letter (a-z)
                </li>
                <li
                  className={status.number ? "text-green-600" : "text-red-600"}
                >
                  {status.number ? "✅" : "❌"} One number (0-9)
                </li>
                <li
                  className={status.special ? "text-green-600" : "text-red-600"}
                >
                  {status.special ? "✅" : "❌"} One special character (@$!%*?&)
                </li>
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg text-white font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 transition"
            }`}
          >
            {loading ? "Setting..." : "Set Password"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Remembered your password?{" "}
            <button
              type="button"
              onClick={() => {
                onClose(); // close SetPasswordModal
                onOpenLogin(); // open Login modal
              }}
              className="text-green-600 font-semibold hover:underline"
            >
              Go to Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
