"use client";

import { React, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useUser } from "../context/UserContext";
import { useCampus } from "../context/CampusContext";
import PropTypes from "prop-types";
import {
  getFriendlyMessage,
  getRequestErrorMessage,
} from "../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function LoginModal({
  show,
  onClose,
  onLoginSuccess,
  onOpenSignup,
  onOpenForgotPassword,
}) {
  const { setCurrentUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setCurrentCampus } = useCampus();
  const [isExiting, setIsExiting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (show) {
      setEmail("");
      setPassword("");
      setMessage("");
      setLoading(false);
      setIsExiting(false);
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const identifier = email.trim();
    const credentials = identifier.includes("@")
      ? { email: identifier, password }
      : { username: identifier, password };

    try {
      const res = await fetch(`${url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(
          getFriendlyMessage(data.message, "Login failed. Try again."),
        );
        return;
      }

      if (data.requirePasswordSetup) {
        sessionStorage.setItem("bootstrapAdminEmail", email);
        setMessageType("success");
        setMessage(data.message);
        onClose();
        onOpenSignup?.();
        return;
      }

      if (data.role === "campus") {
        setCurrentUser(null);
        setCurrentCampus(data.user);
      } else {
        setCurrentUser({
          ...data.user,
          role: data.role,
          selectedCafeNumber:
            data.user?.selectedCafeNumber || data.user?.activeCafeNumber || null,
        });
        setCurrentCampus(null);
      }

      setMessageType("success");
      setMessage("Login successful");
      setIsExiting(true);
      setTimeout(() => {
        onLoginSuccess?.(data.user);
        if (data.role === "admin") router.push("/dashboard");
        else if (data.role === "campus") router.push("/campus");
        else if (data.role === "cafe" || data.role === "cafe manager")
          router.push("/cafe-manager/dashboard");
        else if (data.role === "ticker") router.push("/ticker/dashboard");
      }, 400);
    } catch (error) {
      clearTimeout(timeoutId);
      setMessageType("error");
      setMessage(getRequestErrorMessage(error, "Login failed. Try again."));
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
        className={`modal-panel relative mt-16 mr-4 w-full max-w-sm rounded-2xl p-6 transition-all duration-300 sm:mt-20 sm:mr-6 sm:max-w-md sm:p-8 ${isExiting ? "animate-fadeOut" : "animate-fadeIn"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-center text-2xl font-bold text-slate-900">
          Welcome Back
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          Sign in to access your account
        </p>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded-lg text-sm ${
              messageType === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {message}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex flex-col gap-4"
        >
          {" "}
          <input
            type="text"
            placeholder="Email or Username"
            autoComplete="off"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="modal-input w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="modal-input w-full rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            >
              {showPassword ? (
                <AiOutlineEyeInvisible size={20} />
              ) : (
                <AiOutlineEye size={20} />
              )}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenForgotPassword();
              }}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-white/10 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-20px);
          }
        }

        .animate-fadeOut {
          animation: fadeOut 0.4s forwards;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #0f172a !important;
          transition: background-color 5000s ease-in-out 0s;
          box-shadow: inset 0 0 0px 1000px rgba(255, 255, 255, 1) !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}

LoginModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
  onOpenSignup: PropTypes.func.isRequired,
  onOpenForgotPassword: PropTypes.func.isRequired,
  onRequireDeviceOtp: PropTypes.func,
};
