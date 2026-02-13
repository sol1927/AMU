"use client";

import { useRef, useState, useEffect } from "react";

export default function ConfirmModal({
  open,
  position,
  title,
  message,
  onConfirm,
  onCancel,
}) {
  const modalRef = useRef(null);
  const [shake, setShake] = useState(false);

  // Detect clicks outside to shake
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

  const style = {
    position: "absolute",
    top: position?.top || 0,
    left: position?.left || "auto",
    right: position?.right || 0,
    zIndex: 50,
  };

  return (
    <>
      {/* Soft semi-transparent background */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />

      {/* Modal content */}
      <div
        style={style}
        ref={modalRef}
        className={`bg-white rounded-2xl p-5 shadow-2xl z-50 w-72 transform transition-all duration-300
          ${shake ? "animate-shake" : "scale-100 opacity-100"} hover:shadow-3xl`}
      >
        {/* Optional arrow pointing to dropdown */}
        <div className="absolute -top-2 right-4 w-4 h-4 bg-white rotate-45 shadow-md"></div>

        <h2 className="text-base font-semibold mb-2 text-gray-800">
          {title || "Are you sure?"}
        </h2>
        {message && <p className="text-gray-600 mb-4">{message}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
