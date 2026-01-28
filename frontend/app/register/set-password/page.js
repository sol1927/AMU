"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false); // ✅ initially hidden
  const router = useRouter();

  // Password rules
  const rules = {
    length: (pw) => pw.length >= 8,
    uppercase: (pw) => /[A-Z]/.test(pw),
    lowercase: (pw) => /[a-z]/.test(pw),
    number: (pw) => /\d/.test(pw),
    special: (pw) => /[@$!%*?&]/.test(pw),
  };

  const checkRules = (pw) =>
    Object.fromEntries(Object.entries(rules).map(([k, fn]) => [k, fn(pw)]));
  const status = checkRules(password);
  const allValid = Object.values(status).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allValid) {
      setMessage("Password does not meet all requirements");
      setShowRules(true); // show rules if invalid
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setShowRules(true);
      return;
    }

    const res = await fetch("http://localhost:5000/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // important for sending the otpToken cookie
      body: JSON.stringify({ password, confirmPassword }), // ✅ send both
    });
    try {
      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        router.push("/login");
      }
    } catch {
      setMessage("Connection error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4">Set Password</h2>
        {message && <p className="mb-4 text-blue-600">{message}</p>}

        {/* Password Input */}
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowRules(true)} // ✅ show dropdown on focus
            onBlur={() => {
              if (allValid) setShowRules(false); // hide if all rules met
            }}
            className="w-full p-2 border rounded"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-sm text-gray-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Confirm Password Input */}
        <div className="relative mb-2">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-2 text-sm text-gray-500"
          >
            {showConfirm ? "Hide" : "Show"}
          </button>
        </div>

        {/* Password Rules Dropdown */}
        {showRules && !allValid && (
          <div className="mb-4 p-2 bg-gray-50 border border-gray-300 rounded text-sm">
            <p className="font-semibold mb-1">Password must include:</p>
            <ul className="space-y-1">
              <li className={status.length ? "text-green-600" : "text-red-600"}>
                {status.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li
                className={status.uppercase ? "text-green-600" : "text-red-600"}
              >
                {status.uppercase ? "✅" : "❌"} One uppercase letter (A-Z)
              </li>
              <li
                className={status.lowercase ? "text-green-600" : "text-red-600"}
              >
                {status.lowercase ? "✅" : "❌"} One lowercase letter (a-z)
              </li>
              <li className={status.number ? "text-green-600" : "text-red-600"}>
                {status.number ? "✅" : "❌"} One number (0-9)
              </li>
              <li
                className={status.special ? "text-green-600" : "text-red-600"}
              >
                {status.special ? "✅" : "❌"} One special character (@$!%*?&)
              </li>
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Set Password
        </button>
      </form>
    </div>
  );
}
