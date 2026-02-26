"use client";

import { React, useState, useEffect, useRef } from "react";
import { FiCamera } from "react-icons/fi";
import CameraModal from "./CameraModal";
import PropTypes from "prop-types";

export default function EditStudentModal({ student, onCancel, onSubmit }) {
  const [name, setName] = useState(student.name);
  const [studentId, setStudentId] = useState(student.studentId);
  const [department, setDepartment] = useState(student.department);
  const [batch, setBatch] = useState(student.batch);
  const [fastingType, setFastingType] = useState(
    student.fastingType || "not_fasting",
  );
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(student.profileUrl || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
      setTimeout(() => setError(""), 2000);
      return;
    }

    if (!name || !studentId || !department || !batch) {
      setError("Please fill in all required fields.");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setLoading(true);

    try {
      const errMessage = await onSubmit({
        id: student._id,
        name,
        studentId,
        department,
        batch,
        fastingType,
        photo,
      });

      if (errMessage) {
        setError(errMessage);
        setTimeout(() => setError(""), 2000);
        return;
      }

      setSuccess("Student updated successfully!");
      setTimeout(() => onCancel(), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
      setTimeout(() => setError(""), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {" "}
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6 flex flex-col gap-4 w-full max-w-md sm:w-96 max-h-[90vh] overflow-y-auto animate-fadeIn text-white"
      >
        <h3 className="text-lg font-bold text-center">Edit Student</h3>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-500 text-sm">{success}</div>}

        <input
          placeholder="Name*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          placeholder="Student ID*"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          placeholder="Department*"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          placeholder="Batch*"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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

        <div className="flex flex-col items-center relative mb-4">
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
            {loading ? "Updating..." : "Update Student"}
          </button>
        </div>
      </form>
    </div>
  );
}

EditStudentModal.propTypes = {
  student: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    studentId: PropTypes.string.isRequired,
    department: PropTypes.string.isRequired,
    batch: PropTypes.string.isRequired,
    fastingType: PropTypes.string,
    profileUrl: PropTypes.string,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
