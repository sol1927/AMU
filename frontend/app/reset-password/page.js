"use client";

import { React, useEffect, useState, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiMessage, getErrorMessage } from "../utils/userMessage";

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
  const [resetSession, setResetSession] = useState({ token: null, email: null });
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  const rulesRef = useRef(null);
  const searchParams = useSearchParams();

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashToken = params.get("token");
    const hashEmail = params.get("email");
    const queryToken = searchParams?.get("token");
    const queryEmail = searchParams?.get("email");

    setResetSession({
      token: hashToken || queryToken,
      email: hashEmail || queryEmail,
    });

    if (hashToken || hashEmail) {
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search,
      );
    }

    setSessionChecked(true);
  }, [searchParams]);

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
        body: JSON.stringify({
          email: resetSession.email,
          token: resetSession.token,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(
          getApiMessage(data, "We could not reset your password. Please try again."),
        );
        triggerShake();
        setLoading(false);
        return;
      }

      setMessageType("success");
      setMessage(
        getApiMessage(data, "Your password has been reset successfully."),
      );
      setLoading(false);

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error, "We could not reset your password. Please try again."),
      );
      triggerShake();
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200"></div>
          <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!resetSession.token || !resetSession.email) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center p-4">
        <p className="text-red-600 text-center text-lg font-semibold">
          Invalid or expired reset link
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className={`modal-panel w-full max-w-md rounded-2xl p-8 transition-all duration-300 ${
          shake ? "animate-shake" : "animate-fadeIn"
        }`}
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">
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
            className="modal-input w-full rounded border p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
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
            className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
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
            className="modal-input w-full rounded border p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
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
        <div className="page-shell flex h-screen w-full items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-slate-200"></div>
            <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent {...props} />
    </Suspense>
  );
}
