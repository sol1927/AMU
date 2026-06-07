"use client";

import { React, useEffect, useRef, useState } from "react";
import { useUser } from "../../context/UserContext";
import { useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

const getCurrentMealSession = (schedule) => {
  if (!schedule) {
    return {
      label: "Loading...",
      window: "--:-- - --:--",
    };
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
      return {
        label: meal.label,
        window: mealWindow.label || `${mealWindow.start} - ${mealWindow.end}`,
      };
    }
  }

  return {
    label: "ሰዓት አልቋል",
    window: "--:-- - --:--",
  };
};

export default function CafeScanPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  const [student, setStudent] = useState(null);
  const [allowed, setAllowed] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [showManualScan, setShowManualScan] = useState(false);
  const [shokeKey, setShokeKey] = useState(0);
  const [mealSchedule, setMealSchedule] = useState(null);
  const [currentMealSession, setCurrentMealSession] = useState(() =>
    getCurrentMealSession(null),
  );

  const hiddenInputRef = useRef(null);
  const manualInputRef = useRef(null);
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef(null);
  const [toast, setToast] = useState(null);

  const activeCafeNum =
    currentUser?.activeCafeNumber || currentUser?.selectedCafeNumber || 1;

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "cafe") {
      router.replace("/");
      return;
    }
  }, [currentUser, activeCafeNum, router]);

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

  useEffect(() => {
    if (showManualScan) {
      manualInputRef.current?.focus();
    }
  }, [showManualScan]);

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

        const schedule = data.schedule || null;
        setMealSchedule(schedule);
        setCurrentMealSession(getCurrentMealSession(schedule));
      } catch {
        setMealSchedule(null);
        setCurrentMealSession(getCurrentMealSession(null));
      }
    };

    fetchMealSchedule();
  }, []);

  useEffect(() => {
    setCurrentMealSession(getCurrentMealSession(mealSchedule));

    if (!mealSchedule) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setCurrentMealSession(getCurrentMealSession(mealSchedule));
    }, 30000);

    return () => clearInterval(intervalId);
  }, [mealSchedule]);

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

      const allowed = data?.allowed === true;
      const message =
        typeof data?.message === "string" ? data.message.trim() : "";
      const statusMessage =
        (typeof data?.student?.statusMessage === "string"
          ? data.student.statusMessage.trim()
          : "") || (!allowed ? message : "");

      if (data?.student) {
        setStudent({
          ...data.student,
          statusMessage,
        });
        setAllowed(allowed);
        setShokeKey((prev) => prev + 1);
        return;
      }

      if (message) {
        const displayName = message.includes("Time is up")
          ? "ሰዓት አልቋል"
          : message;

        setShokeKey((prev) => prev + 1);
        setStudent({
          name: displayName,
          studentId,
          statusMessage: message === "Student not found" ? undefined : message,
        });
        setAllowed(allowed);
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

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!currentUser || currentUser.role !== "cafe") return null;

  const getCardClasses = () => {
    if (!student)
      return "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500";
    if (student.isInternship)
      return "bg-gradient-to-r from-pink-500 to-red-600 text-white shadow-lg animate-shake";
    if (student.name === "Student not found")
      return "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg animate-shake";
    if (student.name === "Time is up / ሰዓት አልቋል" || student.name === "ሰዓት አልቋል")
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold animate-shake";
    if (allowed)
      return "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg";
    return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold";
  };

  const getStatusText = () => {
    if (!student) return "";
    if (student.name === "Student not found") return "";
    if (allowed) return "ተፈቅዷል";

    const statusMessage = student.statusMessage?.trim();
    if (statusMessage) return statusMessage;

    if (student.assignedCafeNumber) {
      return `This student is assigned to Cafe ${student.assignedCafeNumber}.`;
    }

    return "አልተፈቀደም";
  };

  return (
    <div className="scan-page page-shell flex flex-col px-4 pt-4 md:px-6 min-h-[75vh]">
      <div className="flex flex-1 items-center justify-center pb-24 md:pb-28">
        <div className="flex w-full max-w-6xl items-center justify-center gap-12">
          <div className="flex min-h-[400px] min-w-0 max-w-4xl flex-1 flex-col items-center justify-center">
            {student ? (
              <div
                key={shokeKey}
                className={`w-full max-w-2xl min-w-0 overflow-hidden rounded-[2.5rem] p-8 text-center transition-all duration-300 ${getCardClasses()}`}
              >
                {student.name !== "Student not found" && (
                  <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-300 text-center text-sm font-semibold text-black">
                    {student.profileUrl ? (
                      <img
                        src={student.profileUrl}
                        alt={student.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="break-words px-2">{student.name}</span>
                    )}
                  </div>
                )}

                <h3 className="mb-3 break-words px-2 text-center text-4xl font-bold">
                  {student.name}
                </h3>

                {student.isInternship && (
                  <p className="mb-2 inline-block rounded-full bg-white/20 px-4 py-1 text-lg font-bold">
                    አፓረንት
                  </p>
                )}

                {student.name !== "Student not found" && (
                  <div className="mx-auto mt-4 w-full min-w-0 max-w-sm space-y-2 px-2 text-lg">
                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold">ID:</span>
                      <span className="min-w-0 flex-1 break-words text-left">
                        {student.studentId || "..."}
                      </span>
                    </div>

                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold">
                        Department:
                      </span>
                      <span className="min-w-0 flex-1 break-words text-left">
                        {student.department || "..."}
                      </span>
                    </div>

                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold">Batch:</span>
                      <span className="min-w-0 flex-1 break-words text-left">
                        {student.batch || "..."}
                      </span>
                    </div>

                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold">Fasting:</span>
                      <span
                        className={`min-w-0 flex-1 break-words text-left ${
                          student.fastingType !== "not_fasting"
                            ? "text-2xl font-semibold"
                            : ""
                        }`}
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
                  </div>
                )}
                <p className="mt-4 break-words px-2 text-4xl font-bold">
                  {getStatusText()}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-xl font-bold text-slate-400 dark:text-slate-500">
                <div className="mb-4 h-28 w-28 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                Waiting for Card Scan...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed right-4 bottom-4 z-40 flex justify-end">
        <div className="surface-panel w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          {!showManualScan ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl bg-blue-600 px-3 py-2 text-white">
                <div className="truncate text-sm font-bold">
                  {currentMealSession.label}
                </div>
                <div className="truncate text-xs text-blue-100">
                  {currentMealSession.window}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualScan(true)}
                  className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95"
                >
                  Manual Scan
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="flex-1 rounded-xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-inherit">
                  Manual Scan
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualScan(false)}
                  className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Hide
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  ref={manualInputRef}
                  type="text"
                  placeholder="Student ID"
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleManualScan();
                  }}
                  className="field-surface min-w-0 flex-1 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleManualScan}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
                >
                  Scan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={hiddenInputRef}
        type="text"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      {toast && (
        <div
          className={`app-toast fixed bottom-6 right-6 rounded-xl px-4 py-2 text-white font-bold shadow-lg transition ${
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
    </div>
  );
}
