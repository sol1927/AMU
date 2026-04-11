"use client";

import { React, useEffect, useRef, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getCurrentMealSession = () => {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 6 && hour < 9) return "ቁርስ"; // Breakfast
  if (hour >= 11 && hour < 14) return "ምሳ"; // Lunch
  if (hour >= 17 && hour < 20) return "እራት"; // Dinner

  return "ሰዓት አልቋል"; // Outside meal times
};

export default function StationScanPage() {
  const [student, setStudent] = useState(null);
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");
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
    }, 3000);

    return () => clearTimeout(timer);
  }, [student]);

  useEffect(() => {
    hiddenInputRef.current?.focus();
    lastTimeRef.current = Date.now();
  }, []);

  const processScan = async (studentId) => {
    try {
      const res = await fetch(`${url}/meal/students/station-scan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      let data = null;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (data && data.student) {
        setStudent(data.student);
        setAllowed(data.allowed ?? false);
        setShokeKey((prev) => prev + 1);
        return;
      }

      if (data && data.message) {
        const displayName = data.message.includes("Time is up")
          ? "Time is up / ሰዓት አልቋል"
          : data.message;

        setShokeKey((prev) => prev + 1);
        setStudent({ name: displayName, studentId });
        setAllowed(data.allowed ?? false);
        return;
      }

      setShokeKey((prev) => prev + 1);
      setStudent({ name: "Student not found", studentId });
      setAllowed(false);
    } catch (err) {
      console.error("Scan failed:", err);
      showToast("Failed to scan student");
      setShokeKey((prev) => prev + 1);
      setStudent({ name: "Student not found", studentId });
      setAllowed(false);
    }
  };

  useEffect(() => {
    const handleScannerInput = (e) => {
      if (e.target === manualInputRef.current) return;

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
  }, []);

  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    processScan(manualInput.trim());
    setManualInput("");
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
    if (student.isInternship)
      return "bg-gradient-to-r from-pink-500 to-red-600 text-white shadow-lg";
    if (student.name === "Student not found")
      return "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg";
    if (allowed)
      return "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg";
    return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold";
  };

  const getStatusText = () => {
    if (!student) return "";
    return allowed ? "ተፈቅዷል ✅" : "አልተፈቀደም ❌";
  };

  return (
    <>
      <CampusNavbar />
      <div className="pt-24 w-full min-h-[calc(100vh-96px)] flex items-center justify-center">
        <div className="w-full max-w-6xl flex items-center justify-center gap-12">
          {/* Main Scan Card - Perfectly Centered */}
          <div className="flex-1 max-w-4xl flex flex-col items-center justify-center min-h-[400px]">
            {student ? (
              <div
                key={shokeKey}
                className={`w-full max-w-2xl p-8 rounded-xl flex flex-col justify-center items-center text-center transition-all duration-300 ${getCardClasses()}`}
              >
                {student.name !== "Student not found" && (
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

                {student.isInternship && (
                  <p className="mb-2 rounded-full bg-white/20 px-4 py-1 text-lg font-bold">
                    አፓረንት
                  </p>
                )}

                {student.name !== "Student not found" && (
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
                <p className="text-4xl font-bold mt-4">{getStatusText()}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 font-bold text-xl">
                <div className="w-28 h-28 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                Waiting for Card Scan...
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-4 inset-x-4 flex flex-col md:flex-row items-center justify-between gap-3 z-40">
          <div className="hidden md:block w-[140px]"></div>

          <div className="w-full max-w-md flex flex-col md:flex-row gap-2 items-center bg-black/80 backdrop-blur-md p-3 md:p-4 rounded-2xl shadow-xl border border-white/20">
            <div className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white font-bold whitespace-nowrap">
              {getCurrentMealSession()}
            </div>
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
          <div className="w-full md:w-[140px]"></div>
        </div>

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

    </>
  );
}
