"use client";

import { React, useRef, useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import PropTypes from "prop-types";

export default function AdminPasswordModal({
  onSubmit,
  onCancel,
  errorMessage,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [offlineError, setOfflineError] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onCancel]);

  useEffect(() => {
    if (!offlineError) return;
    const timer = setTimeout(() => setOfflineError(""), 2000);
    return () => clearTimeout(timer);
  }, [offlineError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const passwordField = e.target.password;
    const enteredPassword = passwordField.value.trim();

    if (!enteredPassword) {
      setOfflineError("Please enter your password");
      return;
    }

    await onSubmit(enteredPassword);
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        className="modal-panel flex w-80 flex-col gap-4 rounded-2xl p-6 animate-fadeIn"
      >
        <h3 className="text-center text-lg font-semibold text-slate-900">
          Enter Admin Password
        </h3>

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Admin password"
            autoFocus
            className="modal-input w-full rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <span
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-700"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </span>
        </div>

        {errorMessage && (
          <p className="text-red-500 text-sm text-center">{errorMessage}</p>
        )}
        {offlineError && (
          <p className="text-red-400 text-sm text-center">{offlineError}</p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            Submit
          </button>
        </div>
      </form>

      {/* eslint-disable-next-line react/no-unknown-property */}
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

AdminPasswordModal.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
};
