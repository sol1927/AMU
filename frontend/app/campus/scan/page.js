"use client";

import { useEffect, useRef, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function StationScanPage() {
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [showClearModal, setShowClearModal] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [campusPassword, setCampusPassword] = useState("");

  const hiddenInputRef = useRef(null);
  const manualInputRef = useRef(null); // for manual input box
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef(null); // separate timeout

  useEffect(() => {
    lastTimeRef.current = Date.now(); // set the current time once after mount
  }, []);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const processScan = async (studentId) => {
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
        setStudent({
          name: "Unknown Student",
          studentId: studentId,
          department: "-",
          batch: "-",
          fastingType: "not_fasting",
          profileUrl: null,
        });
        setAllowed(false);
        setMessage("Unknown ID");
      }

      hiddenInputRef.current?.focus();
    } catch (err) {
      setStudent({
        name: "Unknown Student",
        studentId: "",
        department: "-",
        batch: "-",
        fastingType: "not_fasting",
        profileUrl: null,
      });
      setAllowed(false);
      setMessage("Scan failed");
    }
  };

  useEffect(() => {
    const handleScannerInput = (e) => {
      // Ignore if the user is typing in manual input
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
      alert("Station cleared. Students can eat again.");
    } catch (err) {
      setPasswordError("Something went wrong");
    }
  };

  return (
    <>
      <CampusNavbar />

      <div className="pt-24 w-full min-h-[calc(100vh-96px)] flex flex-col items-center outline-none">
        {/* Instruction above student info */}
        {student && (
          <div className="text-gray-600 font-semibold text-xl mb-4">
            Scan a card to continue
          </div>
        )}

        {/* 🟢 Student Info Display */}
        <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center transition-all duration-300 relative">
          {student ? (
            <div
              className={`w-full h-full p-8 rounded-lg flex flex-col justify-center items-center text-center ${
                allowed
                  ? "bg-green-100 border border-green-400"
                  : "bg-red-100 border border-red-400"
              }`}
            >
              <h3 className="text-4xl font-bold mb-3">{student.name}</h3>
              <p className="text-lg mb-1">ID: {student.studentId}</p>
              <p className="text-lg mb-1">Department: {student.department}</p>
              <p className="text-lg mb-1">Batch: {student.batch}</p>

              {/* Fasting Type as large colored buttons */}
              <div className="flex gap-6 mt-6">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                      student.fastingType === "not_fasting"
                        ? "border-indigo-600 bg-indigo-200"
                        : "border-gray-300 bg-gray-200"
                    }`}
                  >
                    <span className="font-bold text-white text-sm">NF</span>
                  </div>
                  <span className="mt-2 text-lg font-semibold">
                    Not Fasting
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                      student.fastingType === "fasting"
                        ? "border-green-600 bg-green-400"
                        : "border-gray-300 bg-gray-200"
                    }`}
                  >
                    <span className="font-bold text-white text-sm">F</span>
                  </div>
                  <span className="mt-2 text-lg font-semibold">Fasting</span>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                      student.fastingType === "sunday_fasting"
                        ? "border-yellow-600 bg-yellow-400"
                        : "border-gray-300 bg-gray-200"
                    }`}
                  >
                    <span className="font-bold text-white text-sm">SF</span>
                  </div>
                  <span className="mt-2 text-lg font-semibold">
                    Sunday Fasting
                  </span>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-300 flex-shrink-0">
                  <img
                    src={student.profileUrl || "/default-avatar.png"}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="mt-4 font-bold text-xl">{message}</div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 font-bold text-xl">
              <div className="w-28 h-28 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              Waiting for Card Scan...
            </div>
          )}
        </div>

        {/* 🔵 Manual Scan (fixed bottom center) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md flex gap-2 items-center bg-white p-4 rounded-lg shadow-lg">
          <input
            ref={manualInputRef}
            type="text"
            placeholder="Enter Student ID..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualScan(); // only on Enter
            }}
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleManualScan}
            className="bg-indigo-600 text-white px-4 py-2 rounded font-bold"
          >
            Scan
          </button>
        </div>

        {/* 🔴 Clear Button (fixed bottom right) */}
        <button
          onClick={() => setShowClearModal(true)}
          className="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-2 rounded font-bold shadow-lg hover:bg-red-700 transition-colors"
        >
          Clear Station
        </button>

        {/* ✅ Confirm password modal */}
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
          // readOnly // Prevents mobile keyboards from popping up
        />
      </div>
    </>
  );
}
