"use client";

import { useState, useEffect, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const rulesRef = useRef(null);

  // Password rules
  const rules = {
    length: (pw) => pw.length >= 8,
    uppercase: (pw) => /[A-Z]/.test(pw),
    lowercase: (pw) => /[a-z]/.test(pw),
    number: (pw) => /\d/.test(pw),
    special: (pw) => /[@$!%*?&]/.test(pw),
  };
  const status = Object.fromEntries(
    Object.entries(rules).map(([k, fn]) => [k, fn(newPassword)]),
  );
  const allValid = Object.values(status).every(Boolean);

  // Auto-hide messages after 2s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 2000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Hide rules when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rulesRef.current && !rulesRef.current.contains(e.target)) {
        setShowRules(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!allValid) {
      setError("Password does not meet all requirements");
      setShowRules(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setShowRules(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/profile/me/password", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Password change failed");

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowRules(false);

      // Close modal after 2 sec
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 className="text-lg font-semibold text-center">Change Password</h3>

        {/* Current Password */}
        <div style={inputWrapperStyle}>
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            style={eyeBtnStyle}
          >
            {showCurrent ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        {/* New Password */}
        <div style={inputWrapperStyle}>
          <input
            type={showNew ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onFocus={() => setShowRules(true)}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            style={eyeBtnStyle}
          >
            {showNew ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        {/* Confirm Password */}
        <div style={inputWrapperStyle}>
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            style={eyeBtnStyle}
          >
            {showConfirm ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        {/* Password Rules */}
        {showRules && !allValid && (
          <div ref={rulesRef} style={rulesStyle}>
            <p className="font-semibold mb-1">Password must include:</p>
            <ul className="text-sm space-y-1">
              <li style={{ color: status.length ? "green" : "red" }}>
                {status.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li style={{ color: status.uppercase ? "green" : "red" }}>
                {status.uppercase ? "✅" : "❌"} One uppercase letter (A-Z)
              </li>
              <li style={{ color: status.lowercase ? "green" : "red" }}>
                {status.lowercase ? "✅" : "❌"} One lowercase letter (a-z)
              </li>
              <li style={{ color: status.number ? "green" : "red" }}>
                {status.number ? "✅" : "❌"} One number (0-9)
              </li>
              <li style={{ color: status.special ? "green" : "red" }}>
                {status.special ? "✅" : "❌"} One special character (@$!%*?&)
              </li>
            </ul>
          </div>
        )}

        {/* Messages */}
        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <div style={buttonContainerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={submitBtnStyle}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};
const modalStyle = {
  backgroundColor: "#fff",
  padding: "24px",
  borderRadius: "12px",
  minWidth: "360px",
  maxWidth: "90%",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
};
const inputWrapperStyle = {
  position: "relative",
};
const inputStyle = {
  width: "100%",
  padding: "10px 36px 10px 10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
};
const eyeBtnStyle = {
  position: "absolute",
  top: "50%",
  right: "8px",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "18px",
  color: "#555",
};
const rulesStyle = {
  backgroundColor: "#f9fafb",
  border: "1px solid #ddd",
  padding: "10px",
  borderRadius: "6px",
};
const buttonContainerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};
const cancelBtnStyle = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  backgroundColor: "#f9fafb",
  cursor: "pointer",
};
const submitBtnStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  backgroundColor: "#4f46e5",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};
const errorStyle = { color: "#dc2626", fontSize: "13px", textAlign: "center" };
const successStyle = {
  color: "#16a34a",
  fontSize: "13px",
  textAlign: "center",
};
