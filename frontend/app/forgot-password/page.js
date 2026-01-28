"use client";
import { useState, useEffect } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // "success" or "error"
  const [loading, setLoading] = useState(false);

  // Automatically hide message after 2 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/request-password-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Request failed");
      } else {
        setMessageType("success");
        setMessage(data.message || "Reset link sent successfully");
        setEmail(""); // ✅ clear the email field on success
      }
    } catch {
      setMessageType("error");
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
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

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-2 rounded text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          Remembered your password?{" "}
          <a
            href="/login"
            className="text-green-600 font-semibold hover:underline"
          >
            Sign In
          </a>
        </p>
      </form>
    </div>
  );
}
