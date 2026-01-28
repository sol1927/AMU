"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../../context/TempAdminContext";

export default function VerifyOTPPage() {
  const router = useRouter();
  const { email } = useTempAdmin(); // read email from context
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to partially mask email
  const maskEmail = (email) => {
    const [name, domain] = email.split("@");
    const maskedName =
      name.length <= 2
        ? name[0] + "*"
        : name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
    return maskedName + "@" + domain;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        credentials: "include",
      });

      const data = await res.json();
      setMessage(data.message);

      setTimeout(() => setMessage(""), 2000);

      if (res.ok) {
        setTimeout(() => router.push("/register/set-password"), 1500);
      }
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Please try again.");
      setTimeout(() => setMessage(""), 2000);
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
          Verify Your OTP
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Enter the 6-digit OTP sent to{" "}
          <span className="font-medium">{maskEmail(email)}</span>
        </p>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded ${
              message.toLowerCase().includes("verified")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        <div className="mb-6">
          <input
            type="text"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit OTP"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
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
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          Didn't receive OTP?{" "}
          <a
            href="/register/request-otp"
            className="text-green-600 font-semibold hover:underline"
          >
            Request again
          </a>
        </p>
      </form>
    </div>
  );
}
