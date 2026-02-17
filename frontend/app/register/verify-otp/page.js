"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../../context/TempAdminContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function VerifyOTPPage() {
  const router = useRouter();
  const { email } = useTempAdmin(); // read email from context
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error"); // error or success
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Mask email
  const maskEmail = (email) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (local.length <= 3) {
      return local[0] + "*" + "@" + domain;
    }
    const maskedLocal =
      local[0] + "*".repeat(local.length - 3) + local.slice(-2);
    return maskedLocal + "@" + domain;
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setMessageType("error");
      return setMessage("Please enter the 6-digit OTP");
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

      if (!res.ok) {
        setMessageType("error");
      } else {
        setMessageType("success");
        // Auto redirect to set password page
        setTimeout(() => router.push("/register/set-password"), 1500);
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
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
      } else {
        setMessageType("success");
        setMessage("OTP resent successfully! Check your email.");
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Failed to resend OTP. Try again.");
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
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          maxLength={6}
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400 text-center tracking-widest"
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
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className={`text-sm text-green-600 font-semibold hover:underline ${
              resending ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-gray-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
