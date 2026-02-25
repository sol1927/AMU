"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../context/TempAdminContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function RequestOTPModal({
  show,
  onClose,
  onOpenLogin,
  onSuccess,
}) {
  const router = useRouter();
  const { email, setEmail, name, setName } = useTempAdmin();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (show) {
      setName("");
      setEmail("");
      setMessage("");
    }
  }, [show, setName, setEmail]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

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
      const res = await fetch(`${url}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setMessageType("success");
        setMessage(data.message || "OTP sent successfully");
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(email);
        }, 1000);
      } else {
        setMessageType("error");
        setMessage(data.message || "Failed to send OTP");
        triggerShake();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        !navigator.onLine || error instanceof TypeError
          ? "No internet connection. Please check your network."
          : "Something went wrong. Please try again.",
      );
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
        className={`relative w-full max-w-md bg-white/10 border border-white/20 backdrop-blur-lg rounded-2xl shadow-xl p-8 mt-20 mr-6 transition-all duration-300 ${
          shake ? "animate-shake" : "animate-fadeIn"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-3 text-center text-white">
          Create Your Account
        </h2>
        <p className="text-center text-gray-300 mb-6 text-sm">
          Enter your details to receive an OTP
        </p>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded text-sm transition-opacity duration-300 ${
              messageType === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            } ${message ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {message || "\u00A0"}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            required
            className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email"
            required
            className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-white/10 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
            }`}
          >
            {loading ? "Sending OTP..." : "Request OTP"}
          </button>
        </form>

        <p className="text-center text-gray-300 text-sm mt-6">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="text-indigo-400 font-semibold hover:text-indigo-300"
          >
            Sign In
          </button>
        </p>
      </div>

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
      `}</style>
    </div>
  );
}
