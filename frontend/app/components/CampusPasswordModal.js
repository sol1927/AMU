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
    const enteredPassword = e.target.password.value.trim();
    if (!enteredPassword) {
      return;
    }

    onConfirm(enteredPassword);
  };
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        className="modal-panel flex w-full max-w-xs flex-col gap-4 rounded-2xl p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center text-lg font-semibold text-slate-900">
          Confirm Campus Password
        </h3>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter campus password"
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

        {(localError || offlineError) && (
          <p className="text-red-500 text-sm text-center">
            {localError || offlineError}
          </p>
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
