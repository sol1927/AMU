"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../../context/TempAdminContext";

export default function RequestOTP() {
  const router = useRouter();
  const { email, setEmail, name, setName } = useTempAdmin();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Reset email and name when page loads
  useEffect(() => {
    setEmail("");
    setName("");
  }, [setEmail, setName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
        credentials: "include",
      });

      const data = await res.json();
      setMessage(data.message);

      setTimeout(() => setMessage(""), 2000);

      if (res.ok) {
        setTimeout(() => {
          router.push("/register/verify-otp");
        }, 1000);
      }
    } catch (error) {
      console.error(error);
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
          Create Your Account
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Enter your details to receive an OTP
        </p>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded ${
              message.includes("OTP sent")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          required
          className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
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

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
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
