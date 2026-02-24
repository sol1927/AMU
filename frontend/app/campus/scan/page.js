"use client";

import { useEffect, useRef, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import { useCampus } from "@/app/context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function StationScanPage() {
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [campusPassword, setCampusPassword] = useState("");
  const [shokeKey, setShokeKey] = useState(0); // force container animation restart
  const { currentCampus, setStudentsLoading } = useCampus();
  const [successMessage, setSuccessMessage] = useState("");

  const hiddenInputRef = useRef(null);
  const manualInputRef = useRef(null); // for manual input box
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef(null);
  const [toast, setToast] = useState(null);

  // Toast helper (2 seconds)
  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    lastTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const processScan = async (studentId) => {
    if (!navigator.onLine) {
      showToast("No internet connection");
      setShokeKey((prev) => prev + 1);
      setStudent({ name: "OFFLINE ❌", studentId });
      setAllowed(false);
      setMessage("");
      return;
    }

    try {
      const res = await fetch(`${url}/meal/students/station-scan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();

      if (data.student) {
        setStudent(data.student);
        setAllowed(data.allowed);
        setMessage(data.message);
      } else {
        // Unknown student
        setShokeKey((prev) => prev + 1);
        setStudent({ name: "UNKNOWN STUDENT", studentId });
        setAllowed(false);
        setMessage("");
      }

      hiddenInputRef.current?.focus();
    } catch (err) {
      showToast("Failed to scan student");
      setShokeKey((prev) => prev + 1);
      setStudent({ name: "UNKNOWN STUDENT", studentId });
      setAllowed(false);
      setMessage("");
    }
  };

  useEffect(() => {
    const handleOffline = () => showToast("You are offline");
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  useEffect(() => {
    const handleScannerInput = (e) => {
      if (e.target === manualInputRef.current) return;
      if (showClearModal) return;

      const now = Date.now();
      if (now - lastTimeRef.current > 50) bufferRef.current = "";
      lastTimeRef.current = now;

      if (e.key.length === 1) {
        bufferRef.current += e.key;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          const studentId = bufferRef.current.trim();
          if (studentId) {
            bufferRef.current = "";
            processScan(studentId);
          }
        }, 50);
      } else if (e.key === "Enter") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const studentId = bufferRef.current.trim();
        bufferRef.current = "";
        if (studentId) processScan(studentId);
      }
    };

    window.addEventListener("keydown", handleScannerInput);
    return () => window.removeEventListener("keydown", handleScannerInput);
  }, [showClearModal]);

  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    processScan(manualInput.trim());
    setManualInput("");
  };

  const handleClearConfirm = async (enteredPassword) => {
    // Add this at the top
    if (!navigator.onLine) {
      setPasswordError("No internet connection");
      return;
    }

    try {
      const res = await fetch(`${url}/campus/verify-campus-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: enteredPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || "Wrong password");
        return;
      }

      setCampusPassword(enteredPassword);
      setShowClearModal(false);
      setPasswordError("");

      await fetch(`${url}/meal/students/clear-station`, {
        method: "DELETE",
        credentials: "include",
      });

      setStudent(null);
      setMessage("");
      setAllowed(null);

      hiddenInputRef.current?.focus();
      setSuccessMessage("Station cleared. Students can eat again.");
      setTimeout(() => setSuccessMessage(""), 3000); // disappear after 3s
    } catch (err) {
      setPasswordError("Something went wrong");
    }
  };

  if (setStudentsLoading)
    return <p className="p-6 text-center mt-24">Loading...</p>;
  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white font-bold text-center p-3 rounded-lg shadow z-50">
          {successMessage}
        </div>
      )}

      <div className="pt-24 w-full min-h-[calc(100vh-96px)] flex flex-col items-center outline-none">
        {student && student.name !== "UNKNOWN STUDENT" && (
          <div className="text-gray-600 font-semibold text-xl mb-4">
            Scan a card to continue
          </div>
        )}

        <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center transition-all duration-300 relative">
          {student ? (
            student.name === "OFFLINE ❌" ? (
              <div
                key={shokeKey}
                className="w-full h-full p-8 rounded-lg flex flex-col justify-center items-center text-center bg-gray-700 text-white"
              >
                <h3 className="text-4xl font-bold">OFFLINE ❌</h3>
              </div>
            ) : (
              <div
                key={shokeKey}
                className={`w-full h-full p-8 rounded-lg flex flex-col justify-center items-center text-center transition-all duration-300 ${
                  student.name === "UNKNOWN STUDENT"
                    ? "bg-red-600 text-white animate-shake"
                    : allowed
                      ? "bg-green-600 text-white"
                      : "bg-yellow-500 text-black"
                }`}
              >
                {/* Profile Photo on top */}
                {student.name !== "UNKNOWN STUDENT" && (
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-300 mb-6 flex-shrink-0">
                    <img
                      src={student.profileUrl || "/default-avatar.png"}
                      alt={student.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <h3
                  className={`mb-3 font-bold text-center ${
                    student.name === "UNKNOWN STUDENT"
                      ? "text-white text-4xl"
                      : "text-4xl"
                  }`}
                >
                  {student.name}
                </h3>

                <p
                  className={`text-lg ${
                    student.name === "UNKNOWN STUDENT"
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  ID: {student.studentId || ""}
                </p>

                {student.name !== "UNKNOWN STUDENT" && (
                  <>
                    <p className="text-lg mb-1">
                      Department: {student.department}
                    </p>
                    <p className="text-lg mb-1">Batch: {student.batch}</p>
                    <p className="text-2xl mb-1">
                      Fasting:{" "}
                      {student.fastingType === "fasting"
                        ? "ጾመኛ"
                        : student.fastingType === "sunday_fasting"
                          ? "የእሁድ ጾመኛ"
                          : student.fastingType === "muslim_fasting"
                            ? "የሙስሊም ጾመኛ"
                            : "..."}
                    </p>
                    <p
                      className={`text-3xl font-bold mt-2 ${
                        allowed ? "text-green-200" : "text-red-200"
                      }`}
                    >
                      {allowed ? "ተፈቅዷል ✅" : "አልተፈቀደም ❌"}
                    </p>
                  </>
                )}
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 font-bold text-xl">
              <div className="w-28 h-28 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              Waiting for Card Scan...
            </div>
          )}
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md flex gap-2 items-center bg-black/70 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20">
          <input
            ref={manualInputRef}
            type="text"
            placeholder="Enter Student ID..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualScan();
            }}
            className="flex-1 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            onClick={handleManualScan}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:scale-105 transition"
          >
            Scan
          </button>
        </div>

        {/* Clear Button */}
        <button
          onClick={() => setShowClearModal(true)}
          className="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-2 rounded font-bold shadow-lg hover:bg-red-700 transition-colors"
        >
          Clear Station
        </button>

        {/* Confirm password modal */}
        {showClearModal && (
          <ConfirmCampusPasswordModal
            onCancel={() => {
              setShowClearModal(false);
              setPasswordError("");
            }}
            onConfirm={handleClearConfirm}
            errorMessage={passwordError}
          />
        )}

        {/* Hidden input for auto scan */}
        <input
          ref={hiddenInputRef}
          type="text"
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />
      </div>
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-xl text-white shadow-lg transition ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Shoke animation CSS */}
      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-10px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(10px);
          }
        }

        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </>
  );
}
