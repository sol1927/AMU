"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../context/TempAdminContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function RequestOTPModal({ show, onClose, onOpenLogin }) {
  const router = useRouter();
  const { email, setEmail, name, setName } = useTempAdmin();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error"); // "success" or "error"
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Reset fields when modal opens
  useEffect(() => {
    if (show) {
      setName("");
      setEmail("");
      setMessage("");
    }
  }, [show, setName, setEmail]);

  // Auto-clear message after 2 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2000);
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

    // Check connection
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
        setTimeout(() => setMessage(""), 2000);

        // Trigger VerifyOTPModal instead of redirect
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("otpSent"));
          }
        }, 500);
      } else {
        setMessageType("error");
        setMessage(data.message || "Failed to send OTP");
        triggerShake();
      }
    } catch (error) {
      console.error(error);
      setMessageType("error");
      if (!navigator.onLine || error instanceof TypeError) {
        setMessage("No internet connection. Please check your network.");
      } else {
        setMessage("Something went wrong. Please try again.");
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
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mt-20 mr-6 transform transition-all ${
          shake ? "animate-shake" : "animate-fade-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
          Create Your Account
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Enter your details to receive an OTP
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
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-800 placeholder-gray-500"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-800 placeholder-gray-500"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg text-white font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 transition"
            }`}
          >
            {loading ? "Sending OTP..." : "Request OTP"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="text-green-600 font-semibold hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
