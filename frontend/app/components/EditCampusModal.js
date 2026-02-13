"use client";

import { useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function EditCampusModal({ campus, onCancel, onSubmit }) {
  const [name, setName] = useState(campus.name);
  const [email, setEmail] = useState(campus.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Auto-hide message after 2 seconds
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

    // Password validation
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

    const payload = { id: campus._id, name, email };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg p-6 max-w-md w-full relative shadow-lg">
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4 text-center">Edit Campus</h2>

        {message && (
          <p
            className={`mb-4 p-2 rounded text-center ${
              message.toLowerCase().includes("success")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        {/* Name & Email */}
        <input
          type="text"
          placeholder="Campus Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />
        <input
          type="email"
          placeholder="Campus Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        {/* Password Fields */}
        <div className="relative mb-3">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {showCurrent ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>
        <div className="relative mb-4">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {showConfirm ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleUpdate}
            disabled={updateLoading}
            className={`bg-blue-600 text-white px-5 py-2 rounded ${
              updateLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {updateLoading ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
