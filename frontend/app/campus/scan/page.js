"use client";

import { useEffect, useRef, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function StationScanPage() {
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");

  const hiddenInputRef = useRef(null);
  const bufferRef = useRef("");

  // Focus hidden input on load
  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  // 🔵 Automatic scan (USB scanner)
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const studentId = bufferRef.current.trim();
      bufferRef.current = "";
      if (studentId) processScan(studentId);
    } else {
      bufferRef.current += e.key;
    }
  };

  // Call API
  const processScan = async (studentId) => {
    try {
      const res = await fetch(`${url}/meal/students/station-scan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();

      setStudent(data.student);
      setAllowed(data.allowed);
      setMessage(data.message);

      hiddenInputRef.current?.focus();
    } catch (err) {
      setMessage("Scan failed");
      setStudent(null);
      setAllowed(false);
    }
  };

  // Manual scan
  const handleManualScan = () => {
    if (manualInput.trim()) processScan(manualInput.trim());
    setManualInput("");
  };

  // Clear session
  const handleClear = async () => {
    await fetch(`${url}/meal/students/clear-station`, {
      method: "DELETE",
      credentials: "include",
    });
    setStudent(null);
    setMessage("");
    setAllowed(null);
    alert("Station cleared. Students can eat again.");
    hiddenInputRef.current?.focus();
  };

  return (
    <>
      <CampusNavbar />

      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="pt-24 max-w-6xl mx-auto px-6 outline-none grid grid-cols-2 gap-8"
      >
        {/* 🔵 Waiting Scan */}
        <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-10">
          <div className="w-28 h-28 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="mt-6 text-2xl font-bold">Waiting for Card Scan...</h2>
          <input
            ref={hiddenInputRef}
            type="text"
            className="opacity-0 absolute"
          />
        </div>

        {/* 🟢 Manual Scan */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h2 className="text-xl font-bold mb-4">Manual Scan</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter Student ID..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 border p-3 rounded"
            />
            <button
              onClick={handleManualScan}
              className="bg-indigo-600 text-white px-6 py-3 rounded"
            >
              Scan
            </button>
          </div>

          {student && (
            <div
              className={`mt-6 p-6 rounded text-center ${
                allowed
                  ? "bg-green-100 border border-green-400"
                  : "bg-red-100 border border-red-400"
              }`}
            >
              <h3 className="text-2xl font-bold">{student.name}</h3>
              <p>ID: {student.studentId}</p>
              <p>Department: {student.department}</p>
              <p>Batch: {student.batch}</p>
              <p>
                Fasting:{" "}
                {student.fastingType === "not_fasting"
                  ? "Not Fasting"
                  : student.fastingType === "fasting"
                    ? "Fasting"
                    : "Sunday Fasting"}
              </p>
              {student.profileUrl && (
                <img
                  src={student.profileUrl}
                  alt={student.name}
                  className="w-24 h-24 rounded-full mx-auto mt-4 object-cover"
                />
              )}
              <div className="mt-4 font-bold text-lg">{message}</div>
            </div>
          )}
        </div>

        {/* 🔴 Clear Button */}
        <div className="col-span-2 text-center mt-6">
          <button
            onClick={handleClear}
            className="bg-red-600 text-white px-8 py-3 rounded font-bold"
          >
            Clear Station Data
          </button>
        </div>
      </div>
    </>
  );
}
