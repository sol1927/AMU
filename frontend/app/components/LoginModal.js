"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../context/TempAdminContext";
import { useUser } from "../context/UserContext";
import { useCampus } from "../context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function LoginModal({ show, onClose, onLoginSuccess }) {
  const { setCurrentUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const { setCurrentCampus } = useCampus();

  const router = useRouter();
  const { setEmail: setTempEmail } = useTempAdmin();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  // Inside LoginModal
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

    try {
      const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
      const deviceName = "My Device";

      const res = await fetch(`${url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, deviceId, deviceName }),
      });

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
        router.push("/verify-device-otp");
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

      setTimeout(() => {
        onLoginSuccess?.(data.user);
        if (data.role === "admin") router.push("/dashboard");
        else if (data.role === "campus") router.push("/campus");
      }, 800);
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Failed to connect. Please check your internet.");
      triggerShake();
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
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mt-20 mr-6 transform transition-all ${
          shake ? "animate-shake" : "animate-fade-in"
        }`}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h2 className="text-3xl font-extrabold mb-3 text-center text-gray-800">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Sign in to access your account
        </p>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded ${
              messageType === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
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
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 placeholder-gray-500"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 placeholder-gray-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-3 text-gray-500 font-semibold text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onClose(); // close login modal
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("openForgotPasswordModal"),
                  );
                }
              }}
              className="text-sm text-gray-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg text-white font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 transition"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose(); // close login modal
              // open signup modal
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("openSignupModal"));
              }
            }}
            className="text-green-600 font-semibold hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
