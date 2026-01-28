"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const rulesRef = useRef(null);

  // Password rules
  const rules = {
    length: (pw) => pw.length >= 8,
    uppercase: (pw) => /[A-Z]/.test(pw),
    lowercase: (pw) => /[a-z]/.test(pw),
    number: (pw) => /\d/.test(pw),
    special: (pw) => /[@$!%*?&]/.test(pw),
  };

  const status = Object.fromEntries(
    Object.entries(rules).map(([k, fn]) => [k, fn(newPassword)]),
  );

  const allValid = Object.values(status).every(Boolean);

  // Hide rules when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (rulesRef.current && !rulesRef.current.contains(e.target)) {
        if (allValid) setShowRules(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [allValid]);

  // Auto-hide message
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 2000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allValid) {
      setMessageType("error");
      setMessage("Password does not meet all requirements");
      setShowRules(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match");
      setShowRules(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          newPassword,
          confirmPassword, // ✅ FIXED
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Reset failed");
        return;
      }

      setMessageType("success");
      setMessage("Password reset successful");

      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setMessageType("error");
      setMessage("Connection error. Please try again.");
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-600 text-center">
          Invalid or expired reset link
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>

        {message && (
          <p
            className={`mb-4 p-2 text-center rounded ${
              messageType === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        {/* New Password */}
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onFocus={() => setShowRules(true)}
            required
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-sm text-gray-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative mb-2">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-2 text-sm text-gray-500"
          >
            {showConfirm ? "Hide" : "Show"}
          </button>
        </div>

        {/* Password Rules */}
        {showRules && !allValid && (
          <div
            ref={rulesRef}
            className="mb-4 p-3 bg-gray-50 border rounded text-sm"
          >
            <p className="font-semibold mb-1">Password must include:</p>
            <ul className="space-y-1">
              <li className={status.length ? "text-green-600" : "text-red-600"}>
                {status.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li
                className={status.uppercase ? "text-green-600" : "text-red-600"}
              >
                {status.uppercase ? "✅" : "❌"} Uppercase letter
              </li>
              <li
                className={status.lowercase ? "text-green-600" : "text-red-600"}
              >
                {status.lowercase ? "✅" : "❌"} Lowercase letter
              </li>
              <li className={status.number ? "text-green-600" : "text-red-600"}>
                {status.number ? "✅" : "❌"} Number
              </li>
              <li
                className={status.special ? "text-green-600" : "text-red-600"}
              >
                {status.special ? "✅" : "❌"} Special character
              </li>
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
}
