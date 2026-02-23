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
    <>
      {/* Blur Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80]" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[90]">
        <div
          className="p-6 rounded-2xl border border-white/20 
        bg-white/10 backdrop-blur-xl shadow-2xl 
        flex flex-col items-center gap-4 text-white
        transform transition-all duration-300 scale-100"
        >
          {/* Camera Preview */}
          <div className="w-56 h-56 bg-black rounded-xl overflow-hidden border-2 border-white/20">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className="px-4 py-2 rounded-lg 
              bg-gradient-to-r from-green-600 to-green-500 
              hover:scale-105 transition font-medium"
            >
              Capture
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg 
              border border-white/20 bg-white/5 
              hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
