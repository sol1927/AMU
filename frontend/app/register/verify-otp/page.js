"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../../context/TempAdminContext";

export default function VerifyOTPPage() {
  const router = useRouter();
  const { email } = useTempAdmin(); // read email from context
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
      credentials: "include", // include httpOnly cookie
    });

    const data = await res.json();
    setMessage(data.message);

    if (res.ok) {
      router.push("/register/set-password"); // next step
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">
          Register - Step 2
        </h2>

        {message && (
          <p
            className={`mb-4 p-2 rounded text-center ${
              message.includes("verified")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        <div className="mb-6">
          <label className="block mb-1 font-semibold">Enter OTP</label>
          <input
            type="text"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit OTPssssss"
            required
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          Verify OTP
        </button>
      </form>
    </div>
  );
}
