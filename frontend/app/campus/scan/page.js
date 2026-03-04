"use client";

import { React, useEffect, useRef, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import { useCampus } from "@/app/context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function StationScanPage() {
  const [student, setStudent] = useState(null);
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [shokeKey, setShokeKey] = useState(0);

  const { currentCampus, setStudentsLoading } = useCampus();
  const hiddenInputRef = useRef(null);
  const manualInputRef = useRef(null);
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (!student) return;

    const timer = setTimeout(() => {
      setStudent(null);
      setAllowed(null);
    }, 10000);

    return () => clearTimeout(timer);
  }, [student]);

  useEffect(() => {
    hiddenInputRef.current?.focus();
    lastTimeRef.current = Date.now();
  }, []);

  const processScan = async (studentId) => {
    if (!navigator.onLine) {
      showToast("No internet connection");
      setShokeKey((prev) => prev + 1);
      setStudent({ name: "OFFLINE ❌", studentId });
      setAllowed(false);
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
        if (data.student.isInternship) {
          setStudent({ name: "Internship Student ❌", studentId });
          setAllowed(false);
        } else {
          setStudent(data.student);
          setAllowed(data.allowed);
        }
      } else {
        setShokeKey((prev) => prev + 1);
        setStudent({ name: "UNKNOWN STUDENT", studentId });
        setAllowed(false);
      }
    } catch {
      showToast("Failed to scan student");
      setShokeKey((prev) => prev + 1);
      setStudent({ name: "UNKNOWN STUDENT", studentId });
      setAllowed(false);
    }
  };

  useEffect(() => {
    const handleScannerInput = (e) => {
      if (e.target === manualInputRef.current || showClearModal) return;

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
    setPasswordError("");
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
      if (!res.ok) {
        setPasswordError("Incorrect password");
        return;
      }

      setShowClearModal(false);
      setShowClearModal(false);
      setPasswordError("");

      await fetch(`${url}/meal/students/clear-station`, {
        method: "DELETE",
        credentials: "include",
      });

      setStudent(null);
      setAllowed(null);

      hiddenInputRef.current?.focus();
      setSuccessMessage("Station cleared. Students can eat again.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setPasswordError("Something went wrong");
    }
  };

  if (setStudentsLoading || !currentCampus) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-white/5"></div>
          <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-white"></div>
        </div>
      </div>
    );
  }

  const getCardClasses = () => {
    if (!student) return "bg-gray-100";
    if (student.name === "UNKNOWN STUDENT")
      return "bg-gradient-to-r from-red-500 to-red-700 text-white animate-shake shadow-lg";
    if (student.name === "OFFLINE ❌")
      return "bg-gradient-to-r from-gray-600 to-gray-800 text-white shadow-lg";
    if (student.name.includes("Internship"))
      return "bg-gradient-to-r from-pink-500 to-red-600 text-white shadow-lg";
    if (allowed)
      return "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg";
    return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold";
  };

  const getStatusText = () => {
    if (!student) return "";
    if (allowed) return "ተፈቅዷል ✅";
    return "አልተፈቀደም ❌";
  };

  return (
    <>
      <CampusNavbar />
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white font-bold text-center p-3 rounded-lg shadow z-50">
          {successMessage}
        </div>
      )}

      <div className="pt-24 w-full min-h-[calc(100vh-96px)] flex flex-col items-center">
        <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center relative">
          {student ? (
            <div
              key={shokeKey}
              className={`w-full h-full p-8 rounded-xl flex flex-col justify-center items-center text-center transition-all duration-300 ${getCardClasses()}`}
            >
              {student.name !== "UNKNOWN STUDENT" &&
                student.name !== "OFFLINE ❌" && (
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white mb-6 flex items-center justify-center bg-gray-300 text-black text-center text-sm font-semibold">
                    {student.profileUrl ? (
                      <img
                        src={student.profileUrl}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="px-2">{student.name}</span>
                    )}
                  </div>
                )}

              <h3 className="mb-3 font-bold text-4xl text-center">
                {student.name}
              </h3>

              {student.name !== "UNKNOWN STUDENT" &&
                student.name !== "OFFLINE ❌" && (
                  <div className="w-full max-w-sm mt-4 text-lg grid grid-cols-2 gap-2 text-white">
                    <span className="font-semibold">ID:</span>
                    <span>{student.studentId || "..."}</span>

                    <span className="font-semibold">Department:</span>
                    <span>{student.department || "..."}</span>

                    <span className="font-semibold">Batch:</span>
                    <span>{student.batch || "..."}</span>

                    <span className="font-semibold">Fasting:</span>
                    <span
                      className={
                        student.fastingType !== "not_fasting"
                          ? "text-2xl font-semibold"
                          : ""
                      }
                    >
                      {student.fastingType === "fasting"
                        ? "ጾመኛ"
                        : student.fastingType === "sunday_fasting"
                          ? "የእሁድ ጾመኛ"
                          : student.fastingType === "muslim_fasting"
                            ? "የሙስሊም ጾመኛ"
                            : "..."}
                    </span>
                  </div>
                )}

              <p className={`text-4xl font-bold mt-4`}>{getStatusText()}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 font-bold text-xl">
              <div className="w-28 h-28 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              Waiting for Card Scan...
            </div>
          )}
        </div>

        <div className="fixed bottom-4 inset-x-4 flex flex-col md:flex-row items-center justify-between gap-3 z-40">
          <div className="hidden md:block w-[140px]"></div>

          <div className="w-full max-w-md flex gap-2 items-center bg-black/80 backdrop-blur-md p-3 md:p-4 rounded-2xl shadow-xl border border-white/20">
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Enter Student ID..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualScan();
              }}
              className="flex-1 min-w-0 px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              onClick={handleManualScan}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg font-bold hover:scale-105 transition shrink-0"
            >
              Scan
            </button>
          </div>
          <button
            onClick={() => setShowClearModal(true)}
            className="w-full md:w-[140px] bg-red-600/90 backdrop-blur-md text-white px-4 py-3 md:py-2 rounded-2xl md:rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all border border-red-500/50"
          >
            Clear Station
          </button>
        </div>

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

      {/* eslint-disable-next-line react/no-unknown-property */}
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
