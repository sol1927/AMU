"use client";

import { useState, useRef, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function ConfirmCampusPasswordModal({
  onConfirm,
  onCancel,
  errorMessage,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = useRef(null);

  // Prevent outside click from closing modal
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        // Do nothing if clicking outside
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const enteredPassword = e.target.password.value.trim();
    if (!enteredPassword) return;
    onConfirm(enteredPassword); // send password back to parent
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <form
        ref={modalRef}
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "#fff",
          padding: "24px",
          borderRadius: "8px",
          width: "340px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          animation: "modalFadeIn 0.25s ease forwards",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          Confirm Campus Password
        </h3>

        {/* Password Input */}
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter campus password"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 40px 10px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />

          <span
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: "absolute",
              right: "10px",
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

        {/* Error Message */}
        {errorMessage && (
          <div
            style={{
              color: "#dc2626",
              fontSize: "13px",
              textAlign: "center",
              minHeight: "18px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Buttons */}
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 14px",
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
              border: "none",
              backgroundColor: "#4f46e5",
              color: "#fff",
            }}
          >
            Confirm
          </button>
        </div>
      </form>

      {/* Animation */}
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
