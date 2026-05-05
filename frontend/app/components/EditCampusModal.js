"use client";

import { React, useEffect, useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import PropTypes from "prop-types";

export default function EditCampusModal({ campus, onCancel, onSubmit }) {
  const [campusId, setCampusId] = useState(
    campus.campusId ? String(campus.campusId) : "",
  );
  const [name, setName] = useState(campus.name);
  const [location, setLocation] = useState(campus.location || "");
  const [email, setEmail] = useState(campus.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!campusId.trim()) {
      setMessage("Campus ID is required");
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

    const payload = { id: campus._id, campusId, name, location, email };
    if (password) {
      payload.password = password;
    }

    setUpdateLoading(true);
    try {
      const errorMsg = await onSubmit(payload);

      if (errorMsg) {
        setMessage(errorMsg);
      } else {
        setMessage("Campus updated successfully!");
      }
    } catch {
      setMessage("Update failed. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-lg sm:w-80">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close edit campus modal"
          title="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-black transition hover:bg-red-500 hover:text-white"
        >
          X
        </button>
        <h2 className="mb-4 text-center text-xl font-bold text-white">
          Edit Campus
        </h2>
        {message && (
          <div className="mb-4">
            <p
              className={`rounded-lg p-2 text-center text-sm ${
                message.toLowerCase().includes("success")
                  ? "border border-green-500/30 bg-green-500/20 text-green-400"
                  : "border border-red-500/30 bg-red-500/20 text-red-400"
              }`}
            >
              {message}
            </p>
          </div>
        )}

        <label className="ml-1 mb-1 block text-xs text-gray-400">
          Campus Details
        </label>
        <input
          type="number"
          min="1"
          placeholder="Campus ID"
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          placeholder="Campus Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="email"
          placeholder="Campus Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <label className="ml-1 mb-1 block text-xs text-gray-400">
          Change Password
        </label>
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-10 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>
        <div className="relative mb-4">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-10 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white"
          >
            {showConfirm ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={updateLoading}
            className={`rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-purple-800/50 ${
              updateLoading
                ? "cursor-not-allowed opacity-50 hover:scale-100"
                : ""
            }`}
          >
            {updateLoading ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

EditCampusModal.propTypes = {
  campus: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    campusId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string.isRequired,
    location: PropTypes.string,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
