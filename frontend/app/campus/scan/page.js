"use client";

import { React, useEffect, useRef, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

const getCurrentMealSessionLabel = (schedule) => {
  if (!schedule) {
    return "Loading...";
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const meals = [
    { key: "breakfast", label: "ቁርስ" },
    { key: "lunch", label: "ምሳ" },
    { key: "dinner", label: "እራት" },
  ];

  for (const meal of meals) {
    const mealWindow = schedule[meal.key];
    if (!mealWindow?.start || !mealWindow?.end) {
      continue;
    }

    const [startHour, startMinute] = mealWindow.start.split(":").map(Number);
    const [endHour, endMinute] = mealWindow.end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return meal.label;
    }
  }

  return "ሰዓት አልቋል";
};

export default function StationScanPage() {
  const [student, setStudent] = useState(null);
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [shokeKey, setShokeKey] = useState(0);
  const [mealSchedule, setMealSchedule] = useState(null);

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
    }, 1000);

    return () => clearTimeout(timer);
  }, [student]);

  useEffect(() => {
    hiddenInputRef.current?.focus();
    lastTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    const fetchMealSchedule = async () => {
      try {
        const res = await fetch(`${url}/meal/schedule`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load meal schedule");
        }

        setMealSchedule(data.schedule || null);
      } catch {
        setMealSchedule(null);
      }
    };

    fetchMealSchedule();
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
          ? "ሰዓት አልቋል"
          : data.message;

        setShokeKey((prev) => prev + 1);
        setStudent({ name: displayName, studentId });
        setAllowed(data.allowed ?? false);
        return;
      }

      setShokeKey((prev) => prev + 1);
      setStudent({ name: "Student not found", studentId });
      setAllowed(false);
    } catch {
      showToast("We could not complete the scan. Please try again.");
      setShokeKey((prev) => prev + 1);
      setStudent({ name: "Student not found", studentId });
      setAllowed(false);
    }
  };

  useEffect(() => {
    const handleScannerInput = (event) => {
      if (event.target === manualInputRef.current) return;

      const now = Date.now();
      if (now - lastTimeRef.current > 50) bufferRef.current = "";
      lastTimeRef.current = now;

      if (event.key.length === 1) {
        bufferRef.current += event.key;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          const studentId = bufferRef.current.trim();
          if (studentId) {
            bufferRef.current = "";
            processScan(studentId);
          }
        }, 50);
      } else if (event.key === "Enter") {
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
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-slate-200"></div>
          <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  const getCardClasses = () => {
    if (!student) return "bg-gray-100";
    if (student.isInternship)
      return "bg-gradient-to-r from-pink-500 to-red-600 text-white shadow-lg animate-shake";
    if (student.name === "Student not found")
      return "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg animate-shake";
    if (
      student.name === "Time is up / ሰዓት አልቋል" ||
      student.name === "ሰዓት አልቋል"
    )
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold animate-shake";
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
      <div className="scan-page page-shell flex min-h-screen w-full flex-col px-4 pt-24 md:px-6">
        <div className="flex flex-1 items-center justify-center pb-32 md:pb-36">
          <div className="flex w-full max-w-6xl items-center justify-center gap-12">
            <div className="flex min-h-[400px] max-w-4xl flex-1 flex-col items-center justify-center">
              {student ? (
                <div
                  key={shokeKey}
                  className={`w-full max-w-2xl rounded-xl p-8 text-center transition-all duration-300 ${getCardClasses()}`}
                >
                  {student.name !== "Student not found" && (
                    <div className="mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-300 text-center text-sm font-semibold text-black">
                      {student.profileUrl ? (
                        <img
                          src={student.profileUrl}
                          alt={student.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="px-2">{student.name}</span>
                      )}
                    </div>
                  )}

                  <h3 className="mb-3 text-center text-4xl font-bold">
                    {student.name}
                  </h3>

                  {student.isInternship && (
                    <p className="mb-2 rounded-full bg-white/20 px-4 py-1 text-lg font-bold">
                      አፓረንት
                    </p>
                  )}

                  {student.name !== "Student not found" && (
                    <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 text-lg text-white">
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
                  <p className="mt-4 text-4xl font-bold">{getStatusText()}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-xl font-bold text-slate-500">
                  <div className="mb-4 h-28 w-28 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  Waiting for Card Scan...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="fixed inset-x-4 bottom-4 z-40 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="hidden w-[140px] md:block"></div>

          <div className="surface-panel flex w-full max-w-md flex-col items-center gap-2 rounded-2xl p-3 md:flex-row md:p-4">
            <div className="flex items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-bold text-white">
              {getCurrentMealSessionLabel(mealSchedule)}
            </div>
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Enter Student ID..."
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleManualScan();
              }}
              className="field-surface min-w-0 flex-1 rounded-lg px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleManualScan}
              className="app-primary-btn shrink-0 rounded-lg px-5 py-2 font-bold transition hover:-translate-y-0.5"
            >
              Scan
            </button>
          </div>
          <div className="w-full md:w-[140px]"></div>
        </div>

        <input
          ref={hiddenInputRef}
          type="text"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      </div>

      {toast && (
        <div
          className={`app-toast fixed bottom-6 right-6 rounded-xl px-4 py-2 transition ${
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
