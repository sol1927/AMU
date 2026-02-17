"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../context/TempAdminContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function VerifyDeviceOtp() {
  const router = useRouter();
  const { email, setEmail } = useTempAdmin();

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // 🔁 Restore email after refresh
  useEffect(() => {
    if (!email) {
      const savedEmail = sessionStorage.getItem("tempAdminEmail");
      if (savedEmail) setEmail(savedEmail);
    }
  }, [email, setEmail]);

  // ✨ Mask email: first 1 char + *** + last 2 chars
  const maskEmail = (email) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (local.length <= 3) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}***${local.slice(-2)}@${domain}`;
  };

  // Clear message after 3 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setMessageType("error");
      return setMessage("Please enter the 6-digit OTP");
    }

    setLoading(true);
    try {
      const res = await fetch(`${url}/auth/verify-device-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "OTP verification failed");
      } else {
        setMessageType("success");
        setMessage("Device verified successfully!");
        sessionStorage.removeItem("tempAdminEmail");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setMessageType("error");
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`${url}/auth/resend-device-otp`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Failed to resend OTP");
      } else {
        setMessageType("success");
        setMessage("OTP resent successfully. Check your email.");
        setOtp("");
      }
    } catch {
      setMessageType("error");
      setMessage("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-extrabold mb-4 text-center text-gray-800">
          Verify New Device
        </h2>

        {email && (
          <p className="text-center text-gray-500 mb-6">
            Enter the 6-digit OTP sent to{" "}
            <span className="font-semibold">{maskEmail(email)}</span>
          </p>
        )}

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
          type="text"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="6-digit OTP"
          className="w-full p-3 border rounded-lg mb-4 text-center tracking-widest"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-3 rounded-lg text-white font-semibold ${
            loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Verifying..." : "Verify Device"}
        </button>

        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-green-600 font-semibold"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-gray-600"
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
