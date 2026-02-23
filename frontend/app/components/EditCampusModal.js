"use client";

import { useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function EditCampusModal({ campus, onCancel, onSubmit }) {
  const [name, setName] = useState(campus.name);
  const [location, setLocation] = useState(campus.location || ""); // <-- new state
  const [email, setEmail] = useState(campus.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage("");
      if (message.toLowerCase().includes("success")) onCancel();
    }, 2000);
    return () => clearTimeout(timer);
  }, [message, onCancel]);

  const handleUpdate = async () => {
    setMessage("");

    // ✅ OFFLINE CHECK
    if (!navigator.onLine) {
      setMessage("No internet connection. Please check your network.");
      return;
    }

    if ((password || confirmPassword) && !currentPassword) {
      setMessage("Enter current password to update");
      return;
    }
    if (password && password.length < 6) {
      setMessage("New password must be at least 6 characters");
      return;
    }
    if (password && password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    const payload = { id: campus._id, name, location, email };
    if (password) {
      payload.password = password;
      payload.currentPassword = currentPassword;
    }

    try {
      setUpdateLoading(true);
      const errorMsg = await onSubmit(payload);
      if (errorMsg) setMessage(errorMsg);
    } catch (err) {
      console.error(err);
      setMessage("Update failed");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-white/10 border border-white/20 backdrop-blur-lg rounded-2xl p-6 w-80 shadow-lg hover:shadow-purple-900/40 transition-all duration-300 relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4 text-center text-white">
          Edit Campus
        </h2>

        {/* Message */}
        {message && (
          <p
            className={`mb-4 p-2 rounded-lg text-center text-sm ${
              message.toLowerCase().includes("success")
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {message}
          </p>
        )}

        {/* Name */}
        <input
          type="text"
          placeholder="Campus Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 transition"
        />

        {/* Location */}
        <input
          type="text"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 transition"
        />

        {/* Email */}
        <input
          type="email"
          placeholder="Campus Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 transition"
        />

        {/* Current Password */}
        <div className="relative mb-3">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
          >
            {showCurrent ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        {/* New Password */}
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative mb-4">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
          >
            {showConfirm ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        {/* Update Button */}
        <div className="flex justify-center">
          <button
            onClick={handleUpdate}
            disabled={updateLoading}
            className={`px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-purple-800/50 transition ${
              updateLoading
                ? "opacity-50 cursor-not-allowed hover:scale-100"
                : ""
            }`}
          >
            {updateLoading ? "Updating..." : "Update"}
          </button>
        </div>
      </div>

      {/* Animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease forwards;
        }
      `}</style>
    </div>
  );
}
