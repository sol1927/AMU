"use client";

import { useRef, useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function AdminPasswordModal({
  onSubmit,
  onCancel,
  errorMessage,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = useRef(null);

  // close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onCancel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const enteredPassword = e.target.password.value.trim();
    if (!enteredPassword) return;
    onSubmit(enteredPassword);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          animation: "modalFadeIn 0.25s ease forwards",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          Enter Admin Password
        </h3>

        {/* Password input */}
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Admin password"
            autoFocus
            style={{
              width: "100%",
              padding: "8px 36px 8px 10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />

          <span
            onClick={() => setShowPassword((p) => !p)}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </span>
        </div>

        {/* Error message INSIDE modal */}
        {errorMessage && (
          <div
            style={{
              color: "#dc2626",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: "#f9fafb",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              backgroundColor: "#4f46e5",
              color: "#fff",
              border: "none",
            }}
          >
            Submit
          </button>
        </div>
      </form>

      {/* animation */}
      <style jsx global>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
