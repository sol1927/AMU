"use client";

import { useState, useEffect, useRef } from "react";
import { FiCamera } from "react-icons/fi";
import CameraModal from "./CameraModal";

export default function AddStudentModal({ onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fastingType, setFastingType] = useState("not_fasting");
  const fileInputRef = useRef(null);
  const photoOptionsRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Selected file:", file);
      const previewUrl = URL.createObjectURL(file);
      console.log("Preview URL:", previewUrl);
      setPhoto(file);
      setPhotoPreview(previewUrl);
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    if (!name || !studentId || !department || !batch || !photo) {
      setError("Please fill in all required fields, including photo.");
      setLoading(false);
      return;
    }

    const errMessage = await onSubmit({
      name,
      studentId,
      department,
      batch,
      fastingType,
      photo,
    });

    if (errMessage) setError(errMessage);
    setLoading(false);
  };

  // Cleanup URL
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, []); // run only on unmount

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        photoOptionsRef.current &&
        !photoOptionsRef.current.contains(event.target)
      ) {
        setShowPhotoOptions(false);
      }
    };

    if (showPhotoOptions)
      document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPhotoOptions]);

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-4"
      >
        <h3 className="text-lg font-bold">Add New Student</h3>

        {error && <p className="text-red-600">{error}</p>}

        {/* Form Fields */}
        <input
          type="text"
          placeholder="Name*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Student ID*"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Department*"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Batch*"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={fastingType}
          onChange={(e) => setFastingType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="not_fasting">Not Fasting</option>
          <option value="fasting">Fasting</option>
          <option value="sunday_fasting">Sunday Fasting</option>
        </select>

        {/* Photo Section */}
        <div className="flex flex-col items-center mb-4 relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gray-300">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Student"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-white font-bold text-xl">
                {name?.charAt(0)?.toUpperCase() || "S"}
              </div>
            )}
          </div>

          {/* Open Camera / Upload Menu */}
          <button
            type="button"
            onClick={() => setShowPhotoOptions(true)}
            className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg"
          >
            <FiCamera />
          </button>

          {/* Popup menu */}
          {showPhotoOptions && (
            <div
              ref={photoOptionsRef}
              className="absolute bottom-12 right-0 border shadow-2xl rounded p-2 flex flex-col gap-2 z-50"
            >
              <button
                type="button"
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setShowCamera(true);
                  setShowPhotoOptions(false);
                }}
              >
                Use Camera
              </button>
              <button
                type="button"
                className="bg-gray-600 px-2 py-1 rounded text-sm hover:bg-gray-100 cursor-pointer"
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

        {/* Hidden input always present */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Camera Modal */}
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

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={() => {
              setShowCamera(false);
              setShowPhotoOptions(false);
              onCancel();
            }}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded"
          >
            {loading ? "Adding..." : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
