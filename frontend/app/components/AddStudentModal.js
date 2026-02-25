"use client";

import { React, useState, useEffect, useRef } from "react";
import { FiCamera } from "react-icons/fi";
import CameraModal from "./CameraModal";
import PropTypes from "prop-types";

export default function AddStudentModal({ onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fastingType, setFastingType] = useState("not_fasting");

  const fileInputRef = useRef(null);
  const photoOptionsRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 2000);
    return () => clearTimeout(timer);
  }, [error, success]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        photoOptionsRef.current &&
        !photoOptionsRef.current.contains(e.target)
      ) {
        setShowPhotoOptions(false);
      }
    };

    if (showPhotoOptions)
      document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPhotoOptions]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!navigator.onLine) {
      setError("No internet connection. Please try again.");
      return;
    }

    if (!name || !studentId || !department || !batch || !photo) {
      setError("Please fill in all required fields, including photo.");
      return;
    }

    setLoading(true);
    const errMessage = await onSubmit({
      name,
      studentId,
      department,
      batch,
      fastingType,
      photo,
    });
    setLoading(false);

    if (errMessage) {
      setError(errMessage);
      return;
    }
    setSuccess("Student added successfully!");
    setTimeout(() => {
      onCancel();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6 flex flex-col gap-4 w-full max-w-lg sm:w-96 max-h-[90vh] overflow-y-auto animate-fadeIn text-white"
      >
        <h3 className="text-lg font-bold">Add New Student</h3>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-500 text-sm">{success}</div>}

        <input
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Name*"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Student ID*"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Department*"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Batch*"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        />

        <select
          value={fastingType}
          onChange={(e) => setFastingType(e.target.value)}
          className="p-2 bg-white/5 border border-white/10 rounded-xl text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
        >
          <option className="bg-gray-900 text-white" value="not_fasting">
            Not Fasting
          </option>
          <option className="bg-gray-900 text-white" value="fasting">
            Fasting
          </option>
          <option className="bg-gray-900 text-white" value="sunday_fasting">
            Sunday Fasting
          </option>
          <option className="bg-gray-900 text-white" value="muslim_fasting">
            Muslim Fasting
          </option>
        </select>

        <div className="flex flex-col items-center mb-4 relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/30">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Student"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                {name?.charAt(0)?.toUpperCase() || "S"}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPhotoOptions(true)}
            className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg"
          >
            <FiCamera />
          </button>

          {showPhotoOptions && (
            <div
              ref={photoOptionsRef}
              className="absolute bottom-12 right-0 bg-black/50 backdrop-blur-md border border-white/20 shadow-2xl rounded-xl p-2 flex flex-col gap-2"
            >
              <button
                type="button"
                className="px-3 py-1 rounded text-sm hover:bg-white/20"
                onClick={() => {
                  setShowCamera(true);
                  setShowPhotoOptions(false);
                }}
              >
                Use Camera
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded text-sm hover:bg-white/20"
                onClick={() => {
                  setShowPhotoOptions(false);
                  fileInputRef.current?.click();
                }}
              >
                Upload from Device
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {showCamera && (
          <CameraModal
            onCapture={(blob) => {
              setPhoto(blob);
              setPhotoPreview(URL.createObjectURL(blob));
              setShowCamera(false);
            }}
            onCancel={() => setShowCamera(false)}
          />
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
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            {loading ? "Adding..." : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
}

AddStudentModal.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
