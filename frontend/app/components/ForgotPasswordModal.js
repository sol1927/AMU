"use client";
import { useState, useEffect } from "react";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function ForgotPasswordModal({ show, onClose, onOpenLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // "success" or "error"
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Automatically hide message after 2 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  // Reset fields when modal opens
  useEffect(() => {
    if (show) {
      setEmail("");
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

    // ✅ Check connection
    if (!navigator.onLine) {
      setMessageType("error");
      setMessage("No internet connection. Please check your network.");
      triggerShake();
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${url}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Request failed");
        triggerShake();
      } else {
        setMessageType("success");
        setMessage(data.message || "Reset link sent successfully");
        setEmail(""); // clear the email field on success
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
      onClick={onClose} // close when clicking outside
    >
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mt-20 mr-6 transform transition-all ${
          shake ? "animate-shake" : "animate-fade-in"
        }`}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
          Forgot Password
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Enter your email to receive a password reset link
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
            placeholder="Enter your email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Remembered your password?{" "}
          <button
            type="button"
            onClick={() => {
              onClose(); // close forgot password modal
              onOpenLogin(); // open login modal
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
