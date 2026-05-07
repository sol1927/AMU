"use client";

import { React, useState, useEffect } from "react";
import { useTempAdmin } from "../context/TempAdminContext";
import PropTypes from "prop-types";
import { getApiMessage, getErrorMessage } from "../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function RequestOTPModal({
  show,
  onClose,
  onOpenLogin,
  onSuccess,
}) {
  const { email, setEmail, name, setName } = useTempAdmin();
  const [defaultEmail, setDefaultEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (show) {
      setName("");
      setEmail("");
      setDefaultEmail("");
      setMessage("");
    }
  }, [show]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!name?.trim() || !email?.trim() || !defaultEmail?.trim()) {
      setMessageType("error");
      setMessage("All fields are required");
      triggerShake();
      return;
    }

    const normalize = (v) => v?.trim().toLowerCase();

    if (normalize(email) === normalize(defaultEmail)) {
      setMessageType("error");
      setMessage("New email cannot be same as current email");
      triggerShake();
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${url}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          defaultEmail: defaultEmail.trim(),
        }),
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.ok) {
        setMessageType("success");
        setMessage(
          getApiMessage(data, "We sent the verification code to your email."),
        );
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(email);
        }, 1000);
      } else {
        setMessageType("error");
        setMessage(
          getApiMessage(data, "We could not send the verification code."),
        );
        triggerShake();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setMessageType("error");
      setMessage(
        getErrorMessage(error, "We could not send the verification code."),
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-start justify-end"
      onClick={onClose}
    >
      <div
        className={`modal-panel relative mt-16 mr-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl p-6 transition-all duration-300 sm:mt-20 sm:mr-6 sm:max-w-md sm:p-8 ${
          shake ? "animate-shake" : "animate-fadeIn"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-center text-2xl font-bold text-slate-900">
          Update Admin Account
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          Enter the default credentials and your new email
        </p>

        {message && (
          <p
            className={`mb-4 text-center p-2 rounded text-sm transition-opacity duration-300 ${
              messageType === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            } ${message ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {message || "\u00A0"}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            placeholder="Name"
            required
            className="modal-input w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <input
            type="email"
            value={defaultEmail}
            onChange={(e) => setDefaultEmail(e.target.value)}
            autoComplete="off"
            placeholder="Current Email"
            required
            className="modal-input w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            placeholder="New Email"
            required
            className="modal-input w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-white/10 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105"
            }`}
          >
            {loading ? "Processing..." : "Create"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="text-indigo-400 font-semibold hover:text-indigo-300"
          >
            Sign In
          </button>
        </p>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-6px);
          }
          75% {
            transform: translateX(6px);
          }
        }

        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}

RequestOTPModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenLogin: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
