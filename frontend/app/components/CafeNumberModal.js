"use client";

import { React, useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function CafeNumberModal({
  open,
  campusName,
  cafeNumbers,
  selectedCafeNumber,
  onSubmit,
  onClose,
  locked = false,
}) {
  const [value, setValue] = useState(selectedCafeNumber || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(selectedCafeNumber || cafeNumbers?.[0] || "");
  }, [selectedCafeNumber, cafeNumbers]);

  if (!open) return null;

  const handleSave = async () => {
    if (!value) {
      setError("Please choose a cafe number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const message = await onSubmit?.(Number(value));
      if (message) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
      onClick={locked ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500">
          Cafe Number
        </p>
        <h2 className="mt-3 text-2xl font-black text-slate-900">
          {campusName || "Campus"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose the cafe number for this device before opening the dashboard,
          serving students, or scanning meals.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cafeNumbers.map((number) => {
            const active = Number(value) === number;

            return (
              <button
                key={number}
                type="button"
                onClick={() => setValue(number)}
                className={`rounded-2xl border px-4 py-4 text-center font-bold transition ${
                  active
                    ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Cafe {number}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {!locked && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

CafeNumberModal.propTypes = {
  open: PropTypes.bool.isRequired,
  campusName: PropTypes.string,
  cafeNumbers: PropTypes.arrayOf(PropTypes.number),
  selectedCafeNumber: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  locked: PropTypes.bool,
};

CafeNumberModal.defaultProps = {
  campusName: "",
  cafeNumbers: [],
  selectedCafeNumber: "",
  onClose: undefined,
  locked: false,
};
