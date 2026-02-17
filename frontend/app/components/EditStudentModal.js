"use client";

import { useState, useRef, useEffect } from "react";

export default function EditStudentModal({ student, onCancel, onSubmit }) {
  // ---------- Form State ----------
  const [name, setName] = useState(student.name);
  const [studentId, setStudentId] = useState(student.studentId);
  const [department, setDepartment] = useState(student.department);
  const [batch, setBatch] = useState(student.batch);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(student.photoUrl || null);
  const [fastingType, setFastingType] = useState(
    student.fastingType || "not_fasting",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- Webcam ----------
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      setError("Cannot access camera");
      setCapturing(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        setPhoto(blob);
        setPhotoPreview(URL.createObjectURL(blob));
      }, "image/jpeg");
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }
    setCapturing(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setPhoto(e.target.files[0]);
      setPhotoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // If fields are empty, fallback to previous values
    const updatedStudent = {
      id: student._id,
      name: name || student.name,
      studentId: studentId || student.studentId,
      department: department || student.department,
      batch: batch || student.batch,
      fastingType: fastingType || "not_fasting", // ✅ Add this
      photo: photo || null,
    };

    const errMessage = await onSubmit(updatedStudent);
    if (errMessage) setError(errMessage);

    setLoading(false);
  };

  // ---------- Cleanup ----------
  useEffect(() => {
    return () => {
      if (photoPreview && photo) URL.revokeObjectURL(photoPreview);
      stopCamera();
    };
  }, [photoPreview, photo]);

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-4"
      >
        <h3 className="text-lg font-bold">Edit Student</h3>

        {error && <p className="text-red-600">{error}</p>}

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

        {/* Photo */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />

        {/* Webcam Capture */}
        <div>
          {!capturing ? (
            <button
              type="button"
              onClick={startCamera}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Capture from Camera
            </button>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                className="w-full mb-2 rounded border"
              />
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Stop Camera
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        {photoPreview && (
          <div>
            <p className="font-medium mb-1">Photo Preview:</p>
            <img
              src={photoPreview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded border"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded"
          >
            {loading ? "Updating..." : "Update Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
