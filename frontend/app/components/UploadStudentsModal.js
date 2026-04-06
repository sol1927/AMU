"use client";

import { React, useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function UploadStudentsModal({ onCancel, onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess("");
      onCancel();
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, onCancel]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError("");
    }, 10000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) return setError("Please select a CSV or Excel file");

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await onUpload(file);

      if (!data) throw new Error("Upload failed");

      if (data.skippedRows?.length > 0 && !data.students) {
        setError(data.message || "Upload failed due to errors");
        return;
      }

      if (data.students?.length > 0) {
        setSuccess(data.message || "Students uploaded successfully!");
        setFile(null);
      }
    } catch (err) {
      setError(err.message || "Upload failed. Please check the file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6 flex flex-col gap-5 w-[95%] sm:w-[450px] max-h-[95vh] overflow-y-auto animate-fadeIn text-white"
      >
        <h3 className="text-lg font-bold">Upload Students</h3>

        {error && (
          <div className="text-red-600 text-sm whitespace-pre-line">
            {error}
          </div>
        )}
        {success && <div className="text-green-500 text-sm">{success}</div>}

        <label className="relative w-full border-2 border-dashed border-white/30 rounded-2xl p-6 flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition">
          <span className="text-white/80 mb-2">
            Click or drag CSV/Excel file here
          </span>
          <span className="text-xs text-white/50">
            Supported: .csv, .xlsx, .xls
          </span>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>

        {file && (
          <div className="text-sm text-white/90 mt-1">
            Selected file: {file.name}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}

UploadStudentsModal.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
};
