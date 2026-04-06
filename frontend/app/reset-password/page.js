"use client";

import { React, useEffect, useState, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useSearchParams, useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const router = useRouter();

  const rulesRef = useRef(null);
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const email = searchParams?.get("email");

  const rules = {
    length: (pw) => pw.length >= 8,
    uppercase: (pw) => /[A-Z]/.test(pw),
    lowercase: (pw) => /[a-z]/.test(pw),
    number: (pw) => /\d/.test(pw),
    special: (pw) => /[@$!%*?&]/.test(pw),
  };

  const checkRules = (pw) =>
    Object.fromEntries(Object.entries(rules).map(([k, fn]) => [k, fn(pw)]));
  const status = checkRules(newPassword);
  const allValid = Object.values(status).every(Boolean);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
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

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allValid) {
      setMessageType("error");
      setMessage("Password does not meet all requirements");
      setShowRules(true);
      triggerShake();
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match");
      triggerShake();
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${url}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Reset failed");
        triggerShake();
        setLoading(false);
        return;
      }

      setMessageType("success");
      setMessage(data.message || "Password reset successful");
      setLoading(false);

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch {
      setMessageType("error");
      setMessage("Connection error. Please try again.");
      triggerShake();
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-red-600 text-center text-lg font-semibold">
          Invalid or expired reset link
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-">
      <form
        onSubmit={handleSubmit}
        className={`bg-white/10 border border-white/20 backdrop-blur-lg rounded-2xl shadow-xl p-8 w-full max-w-md transition-all duration-300 ${
          shake ? "animate-shake" : "animate-fadeIn"
        }`}
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          Reset Your Password
        </h2>

        {message && (
          <div
            className={`mb-4 p-3 rounded text-sm transition-opacity duration-300 ${
              messageType === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            <p className="text-center">{message}</p>
          </div>
        )}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onFocus={() => setShowRules(true)}
            required
            className="w-full p-3 border border-white/20 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/5 text-white placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 hover:text-white"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        {showRules && !allValid && (
          <div
            ref={rulesRef}
            className="mb-4 p-3 bg-white/10 border border-white/20 rounded text-sm text-white"
          >
            <p className="font-semibold mb-2">Password must include:</p>
            <ul className="space-y-1">
              <li className={status.length ? "text-green-600" : "text-red-600"}>
                {status.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li
                className={status.uppercase ? "text-green-600" : "text-red-600"}
              >
                {status.uppercase ? "✅" : "❌"} One uppercase letter (A-Z)
              </li>
              <li
                className={status.lowercase ? "text-green-600" : "text-red-600"}
              >
                {status.lowercase ? "✅" : "❌"} One lowercase letter (a-z)
              </li>
              <li className={status.number ? "text-green-600" : "text-red-600"}>
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
        <div className="relative mb-6">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setShowRules(false)}
            required
            className="w-full p-3 border border-white/20 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/5 text-white placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-3 text-gray-400 hover:text-white"
          >
            {showConfirm ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !allValid || newPassword !== confirmPassword}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 text-white p-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

import { Suspense } from "react";

export default function ResetPasswordPage(props) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-white/10"></div>
            <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-white"></div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent {...props} />
    </Suspense>
  );
}
