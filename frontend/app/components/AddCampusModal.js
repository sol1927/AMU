"use client";
import { React, useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import PropTypes from "prop-types";

export default function AddCampusModal({ onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 2000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      const errMessage = await onSubmit({ name, location, email, password });

      if (errMessage) {
        setError(errMessage);
      } else {
        setError("");
        setName("");
        setLocation("");
        setEmail("");
        setPassword("");
        setTimeout(() => onCancel(), 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="modal-panel animate-fadeIn flex w-full max-w-xs flex-col gap-4 rounded-2xl p-6 shadow-lg sm:w-80"
      >
        <h3 className="text-lg font-bold">Add Campus</h3>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <input
          className="modal-input w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="modal-input w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="modal-input w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="modal-input w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="app-secondary-btn rounded-lg px-4 py-2 transition hover:border-blue-200 hover:text-blue-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="app-primary-btn rounded-lg px-4 py-2 font-semibold transition hover:scale-105"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

AddCampusModal.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
