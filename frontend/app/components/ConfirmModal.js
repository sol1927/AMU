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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" />
      <div
        ref={modalRef}
        className={`fixed top-20 right-6 w-80 p-5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl z-[60] transform transition-all duration-300
  ${shake ? "animate-shake" : "scale-100 opacity-100"} hover:shadow-3xl`}
      >
        <h2 className="text-base font-semibold mb-2 text-white">
          {title || "Are you sure?"}
        </h2>
        <div className="max-h-[80vh] overflow-y-auto">
          {message && <p className="text-white/80 mb-4">{message}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
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
