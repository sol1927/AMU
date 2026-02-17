"use client";

import { useEffect, useState } from "react";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function EmailChangeModal({
  currentEmail,
  onClose,
  setCurrentUser,
}) {
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Auto-hide success messages after 2 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-hide error messages after 2 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Request OTP for new email
  const handleRequestOtp = async () => {
    if (!newEmail) {
      setError("Enter a new email first");
      return;
    }
    setError("");
    setSuccess("");
    setIsRequesting(true);

    try {
      const res = await fetch(`${url}profile/me/email/request-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setSuccess("OTP sent to your new email!");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  // Verify OTP and update email
  const handleVerifyOtp = async () => {
    if (!otp) {
      setError("Enter the OTP first");
      return;
    }
    setError("");
    setSuccess("");
    setIsVerifying(true);

    try {
      const res = await fetch(`${url}profile/me/email/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP verification failed");

      setSuccess("Email updated successfully!");

      // Update profile email immediately in parent component
      setCurrentUser((prev) => ({ ...prev, email: newEmail }));

      // Clear input fields
      setNewEmail("");
      setOtp("");

      // Close modal after success
      setTimeout(() => onClose(), 500); // slight delay to show success message
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>Change Email</h2>

        <input
          type="email"
          placeholder="New email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={inputStyle}
          autoFocus
        />
        <button
          onClick={handleRequestOtp}
          style={{
            ...submitBtnStyle,
            backgroundColor: newEmail && !isRequesting ? "#4f46e5" : "#a5b4fc",
            cursor: newEmail && !isRequesting ? "pointer" : "not-allowed",
          }}
          disabled={!newEmail || isRequesting}
        >
          {isRequesting ? "Requesting..." : "Request OTP"}
        </button>

        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => {
            const value = e.target.value;
            // Only digits, max 6 characters
            if (/^\d{0,6}$/.test(value)) {
              setOtp(value);
            }
          }}
          style={inputStyle}
          maxLength={6}
        />
        <button
          onClick={handleVerifyOtp}
          style={{
            ...submitBtnStyle,
            backgroundColor: otp && !isVerifying ? "#4f46e5" : "#a5b4fc",
            cursor: otp && !isVerifying ? "pointer" : "not-allowed",
          }}
          disabled={!otp || isVerifying}
        >
          {isVerifying ? "Verifying..." : "Verify OTP"}
        </button>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <div style={buttonContainerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Close
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
  gap: "16px",
  boxShadow: "0 15px 30px rgba(0,0,0,0.3)",
  animation: "fadeIn 0.2s ease-in-out",
};

const titleStyle = {
  margin: 0,
  textAlign: "center",
  fontSize: "20px",
  fontWeight: "600",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
};

const buttonContainerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "12px",
};

const cancelBtnStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  backgroundColor: "#f9fafb",
  cursor: "pointer",
  transition: "all 0.2s",
};

const submitBtnStyle = {
  padding: "10px 16px",
  borderRadius: "6px",
  backgroundColor: "#4f46e5",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  marginTop: "8px",
  transition: "all 0.15s ease-in-out",
};

const errorStyle = {
  color: "#dc2626",
  fontSize: "13px",
  textAlign: "center",
};
const successStyle = {
  color: "#16a34a",
  fontSize: "13px",
  textAlign: "center",
};
