"use client";

import { React, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useTempAdmin } from "../context/TempAdminContext";
import { useUser } from "../context/UserContext";
import { useCampus } from "../context/CampusContext";
import PropTypes from "prop-types";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function LoginModal({
  show,
  onClose,
  onLoginSuccess,
  onOpenSignup,
  onOpenForgotPassword,
  onRequireDeviceOtp,
}) {
  const { setCurrentUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const { setCurrentCampus } = useCampus();
  const [isExiting, setIsExiting] = useState(false);

  const router = useRouter();
  const { setEmail: setTempEmail } = useTempAdmin();

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
    }
  }, [show]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!navigator.onLine) {
      setMessageType("error");
      setMessage("No internet connection. Please check your network.");
      triggerShake();
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
      const deviceName = "My Device";

      const res = await fetch(`${url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, deviceId, deviceName }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Login failed");
        triggerShake();
        return;
      }

      if (data.requireDeviceOtp) {
        setTempEmail(email);
        sessionStorage.setItem("tempAdminEmail", email);
        onRequireDeviceOtp?.();
        return;
      }

      setCurrentUser({ ...data.user, role: data.role });

      if (data.role === "campus") {
        setCurrentCampus(data.user);
      } else {
        setCurrentCampus(null);
      }

      setMessageType("success");
      setMessage("Login successful");
      setIsExiting(true);
      setTimeout(() => {
        onLoginSuccess?.(data.user);
        if (data.role === "admin") router.push("/dashboard");
        else if (data.role === "campus") router.push("/campus");
      }, 400);

      onLoginSuccess?.(data.user);

      if (data.role === "admin") {
        router.push("/dashboard");
      } else if (data.role === "campus") {
        router.push("/campus");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setMessageType("error");
      if (error.name === "AbortError") {
        setMessage("Request timed out. Please try again.");
      } else {
        setMessage("Failed to connect. Please check your internet.");
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end items-start"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm sm:max-w-md bg-white/10 border border-white/20 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 mt-16 sm:mt-20 mr-4 sm:mr-6 transition-all duration-300 ${isExiting ? "animate-fadeOut" : shake ? "animate-shake" : "animate-fadeIn"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-3 text-center text-white">
          Welcome Back
        </h2>
        <p className="text-center text-gray-300 mb-6 text-sm">
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
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
              className="text-xs text-gray-300 hover:text-white"
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

        <p className="text-center text-gray-300 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSignup();
            }}
            className="text-indigo-400 font-semibold hover:text-indigo-300"
          >
            Sign Up
          </button>
        </p>
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

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-6px);
          }
          75% {
            transform: translateX(6px);
          }
        }

        .animate-shake {
          animation: shake 0.5s;
        }

        /* Add this alongside your other keyframes */
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
  onRequireDeviceOtp: PropTypes.func, // optional, if sometimes not passed
};
