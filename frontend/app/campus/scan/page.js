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

  const hiddenInputRef = useRef(null);
  const manualInputRef = useRef(null); // for manual input box
  const bufferRef = useRef("");
  const lastTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    lastTimeRef.current = Date.now();
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
        setShokeKey((prev) => prev + 1); // restart animation
        setStudent({
          name: "UNKNOWN STUDENT",
          studentId: studentId,
        });
        setAllowed(false);
        setMessage("");
      }

      hiddenInputRef.current?.focus();
    } catch (err) {
      setShokeKey((prev) => prev + 1);
      setStudent({
        name: "UNKNOWN STUDENT",
        studentId: "",
      });
      setAllowed(false);
      setMessage("");
    }
  };

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

  if (setStudentsLoading)
    return <p className="p-6 text-center mt-24">Loading...</p>;
  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />

      <div className="pt-24 w-full min-h-[calc(100vh-96px)] flex flex-col items-center outline-none">
        {student && student.name !== "UNKNOWN STUDENT" && (
          <div className="text-gray-600 font-semibold text-xl mb-4">
            Scan a card to continue
          </div>
        )}

        <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center transition-all duration-300 relative">
          {student ? (
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
                  {/* Fasting type */}
                  <p className="text-lg mb-1">
                    Fasting:{" "}
                    {student.fastingType === "fasting"
                      ? "Fasting"
                      : student.fastingType === "sunday_fasting"
                        ? "Sunday Fasting"
                        : "Not Fasting"}
                  </p>
                  {/* Allowed / Not allowed */}
                  <p
                    className={`text-lg font-bold mt-2 ${
                      allowed ? "text-green-200" : "text-red-200"
                    }`}
                  >
                    {allowed ? "Allowed to Eat ✅" : "Not Allowed ❌"}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 font-bold text-xl">
              <div className="w-28 h-28 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              Waiting for Card Scan...
            </div>
          )}
        </div>

        {/* Manual Scan */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md flex gap-2 items-center bg-white p-4 rounded-lg shadow-lg">
          <input
            ref={manualInputRef}
            type="text"
            placeholder="Enter Student ID..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualScan();
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
