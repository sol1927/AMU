"use client";

import { useRef, useEffect } from "react";

export default function CameraModal({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (!mounted) {
          // If unmounted before stream is ready
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera(); // ✅ always stop on unmount
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      stopCamera(); // stop camera immediately
      if (blob) onCapture(blob);
    }, "image/jpeg");
  };

  const handleCancel = () => {
    stopCamera(); // stop camera immediately
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-4 rounded-lg flex flex-col items-center gap-3 shadow-lg">
        <div className="w-40 h-40 bg-black rounded overflow-hidden border-2 border-gray-300">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          <button
            type="button" // ✅ important
            onClick={handleCapture}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            Capture
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
