"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTempAdmin } from "../../context/TempAdminContext";

export default function RequestOTP() {
  const router = useRouter();
  const { email, setEmail, name, setName } = useTempAdmin();
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1. Change the URL to "request-otp" (NOT verify-otp)
      const res = await fetch("http://localhost:5000/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 2. Send name and email (NOT otp)
        body: JSON.stringify({ name, email }), 
        credentials: "include", 
      });

      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        // 3. Move to the next page where the user enters the OTP
        setTimeout(() => {
          router.push("/register/verify-otp");
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">
          Register - Step 1
        </h2>
        {message && <p className="mb-4 text-center">{message}</p>}

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full p-3 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          Request OTP
        </button>
      </form>
    </div>
  );
}
