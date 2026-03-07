"use client";
import { React, useRef, useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import PropTypes from "prop-types";

export default function ConfirmCampusPasswordModal({
  onConfirm,
  onCancel,
  errorMessage,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [offlineError, setOfflineError] = useState("");
  const [localError, setLocalError] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    setLocalError(errorMessage || "");

    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setLocalError("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (!offlineError) return;
    const timer = setTimeout(() => setOfflineError(""), 2000);
    return () => clearTimeout(timer);
  }, [offlineError]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onCancel]);

  const handleSubmit = (e) => {
    e.preventDefault();

    setOfflineError("");

    if (!navigator.onLine) {
      setOfflineError("No internet connection. Please check your network.");
      return;
    }

    const enteredPassword = e.target.password.value.trim();
    if (!enteredPassword) {
      return;
    }

    onConfirm(enteredPassword);
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        className="bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6 flex flex-col gap-4 w-full max-w-xs animate-fadeIn"
      >
        <h3 className="text-lg font-semibold text-center text-white">
          Confirm Campus Password
        </h3>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter campus password"
            autoFocus
            className="w-full px-3 py-2 pr-10 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <span
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-white/70 hover:text-white transition"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </span>
        </div>

        {(localError || offlineError) && (
          <p className="text-red-500 text-sm text-center">
            {localError || offlineError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            Confirm
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

ConfirmCampusPasswordModal.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
};
