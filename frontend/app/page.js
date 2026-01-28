"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Cafeteria Admin Portal</h1>
        <p className="mb-6 text-gray-700">
          Securely manage your cafeteria system. Register or login to continue.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/register/request-otp"
            className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition"
          >
            Register (Request OTP)
          </Link>

          <Link
            href="/login"
            className="bg-green-500 text-white p-3 rounded hover:bg-green-600 transition"
          >
            Login
          </Link>

          <Link
            href="/forgot-password"
            className="bg-yellow-500 text-white p-3 rounded hover:bg-yellow-600 transition"
          >
            Forgot Password
          </Link>
        </div>
      </div>
    </div>
  );
}
