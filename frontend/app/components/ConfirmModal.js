"use client";

import { React, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}) {
  const modalRef = useRef(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="modal-backdrop fixed inset-0 z-50" />
      <div
        ref={modalRef}
        className={`modal-panel fixed right-6 top-20 z-[60] w-80 rounded-2xl p-5 transform transition-all duration-300
  ${shake ? "animate-shake" : "scale-100 opacity-100"} hover:shadow-3xl`}
      >
        <h2 className="mb-2 text-base font-semibold text-slate-900">
          {title || "Are you sure?"}
        </h2>
        <div className="max-h-[80vh] overflow-y-auto">
          {message && <p className="mb-4 text-slate-600">{message}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white font-medium hover:scale-105 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes shake {
          0% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          50% {
            transform: translateX(5px);
          }
          75% {
            transform: translateX(-5px);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-shake {
          animation: shake 0.5s ease;
        }
      `}</style>
    </>,
    document.body,
  );
}

ConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  position: PropTypes.string,
  title: PropTypes.string,
  message: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};