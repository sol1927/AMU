"use client";

import { React, useEffect, useRef, useState } from "react";
import { useUser } from "../../context/UserContext";
import { useRouter } from "next/navigation";
import { useSyncManager } from "../../utils/useSyncManager.js";
import { validateScanLocally, getCurrentMealTypeLocal, getTodayString } from "../../utils/offlineValidator.js";
import { markScanned, loadSchedule } from "../../utils/offlineStore.js";

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
  const [cardTimeoutMs, setCardTimeoutMs] = useState(3000);
  const [cameraOn, setCameraOn] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [imageScanLoading, setImageScanLoading] = useState(false);
  const [timeoutOpen, setTimeoutOpen] = useState(false);
  const [cameraUsedForCard, setCameraUsedForCard] = useState(false);
  // null = show default guide; { left, top, width, height } in % = tracked barcode
  const [barcodeBox, setBarcodeBox] = useState(null);
  const hiddenInputRef = useRef(null);
  const manualInputRef = useRef(null);
  const panelRef = useRef(null);
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const scanCooldownRef = useRef(false);
  const processScanRef = useRef(null);
  const originalConsoleErrorRef = useRef(null);
  const originalConsoleWarnRef = useRef(null);
  const originalConsoleLogRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastScannedIdRef = useRef(null);
  const lastScannedTimeRef = useRef(0);
  const timeoutDropdownRef = useRef(null);
  const [toast, setToast] = useState(null);

  const activeCafeNum =
    currentUser?.activeCafeNumber || currentUser?.selectedCafeNumber || 1;

  // ── Campus ID derived from currentUser ──────────────────────────────────────
  const campusId = currentUser?.campusId || currentUser?.id || null;

  // ── Offline sync manager ────────────────────────────────────────────────────
  const { isOnline, isSyncing, pendingCount, enqueueScan } = useSyncManager({
    campusId,
    cafeNum: activeCafeNum,
  });

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
    if (student.name === "Student not found") return; // handled by its own effect below
    if (cameraUsedForCard) return; // camera cards stay open until New Scan is clicked
    if (cardTimeoutMs <= 0) return undefined;

    const timer = setTimeout(() => {
      setStudent(null);
      setAllowed(null);
    }, cardTimeoutMs);

    return () => clearTimeout(timer);
  }, [student, cardTimeoutMs, cameraUsedForCard]);

  // Auto-clear "Student not found" after 1 second
  // If it came from camera, reopen camera automatically for next scan
  useEffect(() => {
    if (student?.name === "Student not found") {
      const t = setTimeout(() => {
        setStudent(null);
        setAllowed(null);
        if (cameraUsedForCard) {
          setCameraUsedForCard(false);
          setCameraOn(true); // reopen camera automatically
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [student, cameraUsedForCard]);

  useEffect(() => {
    hiddenInputRef.current?.focus();
    lastTimeRef.current = Date.now();

    const handlePageClick = (event) => {
      // Close timeout dropdown if clicking outside it
      if (timeoutDropdownRef.current && !timeoutDropdownRef.current.contains(event.target)) {
        setTimeoutOpen(false);
      }
      if (showManualScan) return;
      if (panelRef.current?.contains(event.target)) return;
      hiddenInputRef.current?.focus();
    };

    window.addEventListener("click", handlePageClick);
    return () => window.removeEventListener("click", handlePageClick);
  }, [showManualScan]);

  useEffect(() => {
    if (showManualScan) {
      manualInputRef.current?.focus();
    } else {
      hiddenInputRef.current?.focus();
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

  const processScan = (studentId) => {
    // ── Determine current meal session from local schedule ────────────────────
    const localSchedule = mealSchedule || loadSchedule(campusId);
    const { mealType } = getCurrentMealTypeLocal(localSchedule);
    const today = getTodayString();

    // ── Local-first validation ────────────────────────────────────────────────
    // Always validate from local data first (works online AND offline)
    let result = validateScanLocally({
      studentId,
      campusId,
      cafeNum: activeCafeNum,
      mealType: mealType || "lunch", // fallback so we still show the card
      date: today,
      campusMeta: currentUser,
    });

    // If no local meal window and no local student data yet, show a neutral message
    if (!mealType && result.allowed === false && result.message === "Student not found") {
      result = {
        allowed: false,
        student: { name: "Student not found", studentId },
        denialCode: null,
        message: "Student not found",
        statusMessage: "",
      };
    }

    // ── Show result card immediately ──────────────────────────────────────────
    if (result.student) {
      setStudent({
        ...result.student,
        statusMessage: result.statusMessage,
        denialCode: result.denialCode,
      });
      setAllowed(result.allowed);
      setShokeKey((prev) => prev + 1);
    }

    // ── If allowed: mark locally scanned + enqueue for server upload ──────────
    if (result.allowed && mealType && today) {
      markScanned(campusId, activeCafeNum, today, mealType, studentId);

      const localId = `${studentId}-${today}-${mealType}-${Date.now()}`;
      enqueueScan({
        localId,
        studentId,
        mealType,
        date: today,
        scannedAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const handleScannerInput = (event) => {
      if (event.target === manualInputRef.current) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;

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
        }, 100);
      } else if (event.key === "Enter") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const studentId = bufferRef.current.trim();
        bufferRef.current = "";
        if (studentId) processScan(studentId);
      }
    };

    document.addEventListener("keydown", handleScannerInput, true);
    return () =>
      document.removeEventListener("keydown", handleScannerInput, true);
  }, []);

  // Keep processScanRef up to date so camera callback always has latest version
  processScanRef.current = processScan;

  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    processScan(manualInput.trim());
    setManualInput("");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const startCamera = async () => {
    // Suppress ZXing per-frame noise (only used in fallback path)
    const isZXingNoise = (...args) =>
      typeof args[0] === "string" && args[0].includes("MultiFormatReader");
    originalConsoleErrorRef.current = console.error;
    originalConsoleWarnRef.current = console.warn;
    originalConsoleLogRef.current = console.log;
    console.error = (...args) => { if (!isZXingNoise(...args)) originalConsoleErrorRef.current?.apply(console, args); };
    console.warn  = (...args) => { if (!isZXingNoise(...args)) originalConsoleWarnRef.current?.apply(console, args); };
    console.log   = (...args) => { if (!isZXingNoise(...args)) originalConsoleLogRef.current?.apply(console, args); };

    // Acquire the camera stream (we own it so we can stop it in stopCamera)
    const getStream = async () => {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        return await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      }
    };

    // Helper: compute and set the bounding box overlay from result points
    const updateBarcodeBox = (points) => {
      try {
        const vid = videoRef.current;
        const natW = vid.videoWidth || 1;
        const natH = vid.videoHeight || 1;
        const dispW = vid.clientWidth || 1;
        const dispH = vid.clientHeight || 1;
        const scaleX = dispW / natW;
        const scaleY = dispH / natH;
        const xs = points.map((p) => (p.x ?? p.getX?.() ?? 0) * scaleX);
        const ys = points.map((p) => (p.y ?? p.getY?.() ?? 0) * scaleY);
        const pad = 6;
        setBarcodeBox({
          left:   (Math.max(0, Math.min(...xs) - pad) / dispW) * 100,
          top:    (Math.max(0, Math.min(...ys) - pad) / dispH) * 100,
          width:  ((Math.min(dispW, Math.max(...xs) + pad) - Math.max(0, Math.min(...xs) - pad)) / dispW) * 100,
          height: ((Math.min(dispH, Math.max(...ys) + pad) - Math.max(0, Math.min(...ys) - pad)) / dispH) * 100,
        });
        setTimeout(() => setBarcodeBox(null), 500); // snap back quickly for next scan
      } catch { /* points unavailable */ }
    };

    // Helper: basic sanity check on raw barcode text
    // Rejects garbage/noise results that aren't plausible student IDs
    const isPlausibleId = (text) => {
      if (!text || text.length < 4) return false;           // too short
      if (!/^[\x20-\x7E]+$/.test(text)) return false;      // non-printable chars
      if (!/[A-Za-z0-9]/.test(text)) return false;          // must have at least one alphanumeric
      return true;
    };

    // Helper: check if barcode center falls inside the center guide zone
    // Zone = middle 80% width × middle 60% height of the video frame
    const isInGuideZone = (points) => {
      if (!points || points.length === 0) return true; // no points = trust it
      const vid = videoRef.current;
      const W = vid.videoWidth  || vid.clientWidth  || 1;
      const H = vid.videoHeight || vid.clientHeight || 1;
      const xs = points.map(p => p.x ?? p.getX?.() ?? 0);
      const ys = points.map(p => p.y ?? p.getY?.() ?? 0);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const inX = cx >= W * 0.10 && cx <= W * 0.90; // middle 80% width
      const inY = cy >= H * 0.20 && cy <= H * 0.80; // middle 60% height
      return inX && inY;
    };

    // Helper: called on every successful decode
    // Same card: blocked for 2s to prevent double-scan while card is still in view
    // Different card: scans instantly — zero delay
    const SAME_CARD_BLOCK_MS = 2000;
    const onDetected = (rawText, points) => {
      const studentId = rawText.trim();
      if (!isPlausibleId(studentId)) return;  // sanity check
      if (!isInGuideZone(points)) return;     // must be in guide zone
      const now = Date.now();
      if (
        studentId === lastScannedIdRef.current &&
        now - lastScannedTimeRef.current < SAME_CARD_BLOCK_MS
      ) return;
      lastScannedIdRef.current = studentId;
      lastScannedTimeRef.current = now;
      if (points) updateBarcodeBox(points);
      // Auto-close camera, mark that camera was used, then process scan
      setCameraUsedForCard(true);
      setCameraOn(false);
      processScanRef.current(studentId);
    };

    try {
      const stream = await getStream();
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // ── PATH 1: Native BarcodeDetector (Chrome/Android — C++ speed) ──────────
      // 1D formats only since student IDs use line barcodes
      const FORMATS_1D = ["code_128", "code_39", "codabar", "itf"];

      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        const detector = new window.BarcodeDetector({ formats: FORMATS_1D });
        const tick = async () => {
          if (!streamRef.current) return; // camera was stopped
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const bc = barcodes[0];
              onDetected(bc.rawValue, bc.cornerPoints ? [...bc.cornerPoints] : null);
            }
          } catch { /* frame not ready */ }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return; // don't start ZXing
      }

      // ── PATH 2: ZXing fallback — restricted to 1D formats only ───────────────
      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
        await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.ITF,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      reader.decodeFromVideoElement(videoRef.current, (result) => {
        if (!result) return;
        let points = null;
        try { points = result.getResultPoints(); } catch { /* ignore */ }
        onDetected(result.getText(), points);
      });
    } catch {
      showToast("Camera unavailable or permission denied.");
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    setBarcodeBox(null);
    // Cancel native BarcodeDetector rAF loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Stop ZXing decoder (fallback path)
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch { /* ignore */ }
      readerRef.current = null;
    }
    // Stop all tracks on OUR stream — kills the webcam light
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Clear the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Restore console methods
    if (originalConsoleErrorRef.current) {
      console.error = originalConsoleErrorRef.current;
      originalConsoleErrorRef.current = null;
    }
    if (originalConsoleWarnRef.current) {
      console.warn = originalConsoleWarnRef.current;
      originalConsoleWarnRef.current = null;
    }
    if (originalConsoleLogRef.current) {
      console.log = originalConsoleLogRef.current;
      originalConsoleLogRef.current = null;
    }
  };

  useEffect(() => {
    if (cameraOn) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // (cameraOn is the only dep needed here)
  }, [cameraOn]);

  if (!currentUser || currentUser.role !== "cafe") return null;

  const getCardClasses = () => {
    if (!student)
      return "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500";
    if (student.denialCode === "fasting_restriction")
      return "bg-red-700 text-white shadow-2xl animate-shake border border-red-900";
    if (student.denialCode === "duplicate")
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold animate-shake border border-orange-500";
    if (student.isInternship)
      return "bg-gradient-to-r from-pink-500 to-red-600 text-white shadow-lg animate-shake";
    if (student.name === "Student not found")
      return "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg animate-shake";
    if (student.name === "Time is up / ሰዓት አልቋል" || student.name === "ሰዓት አልቋል")
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg font-semibold animate-shake";
    if (allowed)
      return "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg";
    return "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg animate-shake";
  };

  const getStatusText = () => {
    if (!student) return "";
    if (student.name === "Student not found") return "";
    if (allowed) return "ተፈቅዷል";
    if (
      student.denialCode === "fasting_restriction" ||
      student.denialCode === "duplicate"
    )
      return "አልተፈቀደም";

    const statusMessage = student.statusMessage?.trim();
    if (statusMessage) return statusMessage;

    if (student.assignedCafeName) {
      return `የተመደቡበት ካፌ ${student.assignedCafeName}`;
    }

    if (student.assignedCafeNumber) {
      return `የተመደቡበት ካፌ ${student.assignedCafeNumber}`;
    }

    return "አልተፈቀደም";
  };

  return (
    <div className="scan-page page-shell flex flex-col px-2 pt-3 md:px-6 md:pt-4 min-h-[75vh] overflow-hidden">
      {/* Card / Camera area — grows to fill available space, centered on md+ */}
      <div className="flex flex-1 w-full items-start md:items-center justify-center pt-4 md:pt-0">
        <div className="w-full max-w-2xl min-w-0 px-1">

          {/* ── CAMERA VIEW — mobile only (md+ uses bluetooth/manual only) ── */}
          <div className={`md:hidden relative overflow-hidden rounded-2xl bg-black border border-slate-700 ${cameraOn ? "" : "hidden"}`}>
            <video
              ref={videoRef}
              className="w-full h-[220px] md:h-[320px] object-cover"
              muted
              playsInline
            />
            {/* Scan guide / barcode tracking overlay */}
            <div className="pointer-events-none absolute inset-0">
              {barcodeBox ? (
                <div
                  style={{
                    position: "absolute",
                    left: `${barcodeBox.left}%`,
                    top: `${barcodeBox.top}%`,
                    width: `${barcodeBox.width}%`,
                    height: `${barcodeBox.height}%`,
                    transition: "all 0.15s ease",
                  }}
                  className="rounded border-2 border-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.5)]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-64 rounded-md border-2 border-green-400 opacity-70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              )}
            </div>
            {/* Scanning label */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-xs font-semibold text-white">Scanning...</span>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={() => setCameraOn(false)}
              className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white hover:bg-black/80"
            >
              ✕
            </button>
          </div>

          {/* ── STUDENT RESULT CARD (shown when camera off) ── */}
          {!cameraOn && student ? (
            <div
              key={shokeKey}
              className={`w-full min-w-0 overflow-hidden rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 text-center transition-all duration-300 ${getCardClasses()}`}
            >
              {student.name !== "Student not found" && (
                <div className="mx-auto mb-3 md:mb-6 flex h-20 w-20 md:h-40 md:w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-300 text-center text-sm font-semibold text-black">
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

              <h3 className="mb-2 md:mb-3 break-words px-2 text-center text-2xl md:text-4xl font-bold">
                {student.name}
              </h3>

              {student.isInternship && (
                <p className="mb-1 inline-block rounded-full bg-white/20 px-3 py-0.5 md:px-4 md:py-1 text-sm md:text-lg font-bold">
                  አፓረንት
                </p>
              )}

              {student.name !== "Student not found" && (
                <div className="mx-auto mt-2 md:mt-4 w-full min-w-0 max-w-sm space-y-1 md:space-y-2 px-2 text-sm md:text-lg">
                  <div className="flex min-w-0 gap-2">
                    <span className="shrink-0 font-semibold">ID:</span>
                    <span className="min-w-0 flex-1 break-words text-left">
                      {student.studentId || "..."}
                    </span>
                  </div>

                  <div className="flex min-w-0 gap-2">
                    <span className="shrink-0 font-semibold">Department:</span>
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
                      className={`min-w-0 flex-1 break-words text-left text-base md:text-2xl font-semibold ${student.denialCode === "fasting_restriction"
                        ? "animate-breathing"
                        : ""
                        }`}
                    >
                      {student.fastingType === "fasting"
                        ? "የኦርቶዶክስ ጾመኛ"
                        : student.fastingType === "sunday_fasting"
                          ? "የእሁድ ጾመኛ"
                          : student.fastingType === "muslim_fasting"
                            ? "የሙስሊም ጾመኛ"
                            : "..."}
                    </span>
                  </div>
                </div>
              )}
              <p className="mt-2 md:mt-4 break-words px-2 text-2xl md:text-4xl font-bold">
                {getStatusText()}
              </p>
            </div>
          ) : !cameraOn ? (
            <div className="flex flex-col items-center justify-center gap-4 text-base md:text-xl font-bold text-slate-400 dark:text-slate-500 py-8 md:py-0">
              <div className="h-16 w-16 md:h-28 md:w-28 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              Waiting for Card Scan...
            </div>
          ) : null}
        </div>
      </div>

      {/* Spacer so content never hides behind the fixed bottom panel */}
      <div className="flex-1 min-h-4" />
      <div className="flex-shrink-0 h-[98px] md:h-[162px]" />
      {/* Bottom control panel — full-width strip on mobile, floating card on md+ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:bottom-4 md:left-auto md:right-4 md:flex md:flex-col md:items-end">
        <div
          ref={panelRef}
          className="surface-panel w-full md:max-w-sm rounded-t-2xl md:rounded-2xl border-t border-slate-200 md:border bg-white/95 px-3 py-2 md:p-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
        >
          {/* Card timeout row:
               - md+: always show
               - mobile: show only when camera is NOT active AND (no card OR card came from non-camera scan)
          */}
          {(() => {
            const showTimeout = !cameraOn && !cameraUsedForCard;
            const timeoutOptions = [
              { value: 0,     label: "Off" },
              { value: 3000,  label: "3 seconds" },
              { value: 5000,  label: "5 seconds" },
              { value: 8000,  label: "8 seconds" },
              { value: 10000, label: "10 seconds" },
            ];
            const selectedLabel = timeoutOptions.find(o => o.value === cardTimeoutMs)?.label ?? "3 seconds";
            return (
              <div className={`${showTimeout ? "" : "hidden"} md:block relative mb-2 md:mb-3`} ref={timeoutDropdownRef}>
                <div className="flex items-center justify-between gap-2 rounded-xl md:rounded-2xl bg-slate-100 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="font-semibold">⏱ Card timeout</span>
                  <button
                    type="button"
                    onClick={() => setTimeoutOpen(o => !o)}
                    className="flex items-center gap-1 rounded-lg md:rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 px-2 py-0.5 md:py-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 font-medium transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {selectedLabel}
                    <svg className={`h-3 w-3 transition-transform ${timeoutOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {timeoutOpen && (
                  <ul
                    className="absolute right-0 z-50 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    style={{ bottom: "100%" }}
                  >
                    {timeoutOptions.map(opt => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => { setCardTimeoutMs(opt.value); setTimeoutOpen(false); }}
                          className={`w-full px-3 py-2 text-left text-xs md:text-sm transition hover:bg-blue-50 dark:hover:bg-slate-800 ${
                            cardTimeoutMs === opt.value
                              ? "font-bold text-blue-600 dark:text-blue-400"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}

          {!showManualScan ? (
            <div className="flex items-center gap-2">
              {/* Meal session badge */}
              <div className="flex-1 rounded-xl md:rounded-2xl bg-blue-600 px-2.5 py-1.5 md:px-3 md:py-2 text-white">
                <div className="truncate text-xs md:text-sm font-bold">
                  {currentMealSession.label}
                </div>
                <div className="truncate text-xs text-blue-100">
                  {currentMealSession.window}
                </div>
              </div>

              {/* Online/offline + pending badge */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isOnline
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isOnline ? "bg-green-500" : "bg-red-500"
                    } ${isSyncing ? "animate-pulse" : ""}`}
                  />
                  {isSyncing ? "Syncing" : isOnline ? "Online" : "Offline"}
                </span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    📤 {pendingCount}
                  </span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-1.5 md:gap-2">
                {/* Camera + New Scan — mobile only wrapper, completely hidden on md+ */}
                <div className="md:hidden flex gap-1.5">
                  {/* New Scan — shown when card came from camera */}
                  {student && !cameraOn && cameraUsedForCard && (
                    <button
                      type="button"
                      onClick={() => { setStudent(null); setAllowed(null); setCameraUsedForCard(false); setCameraOn(true); }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition active:scale-95 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      📷 New Scan
                    </button>
                  )}
                  {/* Camera toggle */}
                  <button
                    type="button"
                    onClick={() => setCameraOn((prev) => !prev)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition active:scale-95 ${cameraOn
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                      }`}
                  >
                    {cameraOn ? "📷 On" : "📷 Off"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualScan(true)}
                  className="rounded-lg md:rounded-xl bg-slate-900 px-2.5 py-1.5 md:flex-1 md:px-3 md:py-2 text-xs md:text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95 whitespace-nowrap"
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-lg md:rounded-xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 md:flex-1 md:px-3 md:py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 md:gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs md:text-sm font-semibold text-inherit">
                  Manual Scan
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualScan(false)}
                  className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                  className="field-surface min-w-0 flex-1 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                />
                <button
                  type="button"
                  onClick={handleManualScan}
                  className="rounded-xl bg-blue-600 px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
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
        aria-hidden="true"
        tabIndex={-1}
        className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
      />

      {toast && (
        <div
          className={`app-toast fixed bottom-6 right-6 rounded-xl px-4 py-2 text-white font-bold shadow-lg transition ${toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
        >
          {toast.message}
        </div>
      )}

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        /* Lock scroll while scan page is open */
        body, html {
          overflow: hidden !important;
          height: 100% !important;
        }

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

        @keyframes breathing {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }

        .animate-breathing {
          display: inline-block;
          animation: breathing 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
