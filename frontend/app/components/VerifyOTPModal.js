"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../context/TempAdminContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function VerifyOTPModal({ show, onClose, onOpenLogin }) {
  const router = useRouter();
  const { email } = useTempAdmin();
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [shake, setShake] = useState(false);

  const maskEmail = (email) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (local.length <= 3) return local[0] + "*" + "@" + domain;
    return (
      local[0] + "*".repeat(local.length - 3) + local.slice(-2) + "@" + domain
    );
  };

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
    if (!otp || otp.length !== 6) {
      setMessageType("error");
      setMessage("Please enter the 6-digit OTP");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${url}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        credentials: "include",
      });
      const data = await res.json();
      setMessage(data.message);
      setMessageType(res.ok ? "success" : "error");
      if (res.ok) {
        setMessageType("success");
        setMessage("OTP verified! Opening Set Password...");
        setTimeout(() => {
          onClose(); // close OTP modal
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("openSetPasswordModal"));
          }
        }, 1000);
      } else triggerShake();
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Failed to connect. Please check your internet.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    // Offline mock
    if (!navigator.onLine) {
      setMessageType("error"); // ❌ use error, not success
      setMessage("No internet connection. Please check your network."); // ❌ show proper error
      triggerShake(); // optional, to shake the modal
      return; // stop execution
    }
    // Online: real request
    setResending(true);
    try {
      const res = await fetch(`${url}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Failed to resend OTP. Try again.");
        triggerShake();
      } else {
        setMessageType("success");
        setMessage("OTP resent successfully! Check your email.");
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Failed to resend OTP. Please check your connection.");
      triggerShake();
    } finally {
      setResending(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end items-start"
      onClick={onClose}
    >
      <div
        className={
          "relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mt-20 mr-6 transform transition-all " +
          (shake ? "animate-shake" : "animate-fade-in")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
          Verify Your OTP
        </h2>

        {email && (
          <p className="text-center text-gray-500 mb-6">
            Enter the 6-digit OTP sent to{" "}
            <span className="font-medium">{maskEmail(email)}</span>
          </p>
        )}

        {message && (
          <p
            className={
              "mb-4 text-center p-2 rounded " +
              (messageType === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700")
            }
          >
            {message}
          </p>
        )}

        <input
          type="text"
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          maxLength={6}
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400 text-center tracking-widest"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={
            "w-full p-3 rounded-lg text-white font-semibold " +
            (loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 transition")
          }
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className={
              "text-sm text-green-600 font-semibold hover:underline " +
              (resending ? "opacity-50 cursor-not-allowed" : "")
            }
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose(); // close forgot password modal
              onOpenLogin();
            }}
            className="text-sm text-gray-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
