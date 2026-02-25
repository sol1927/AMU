"use client";

import { React, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import { useCampus } from "@/app/context/CampusContext";
import { IoChevronBackSharp } from "react-icons/io5";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusStudentGroupsPage() {
  const { currentCampus, refreshCampus } = useCampus();
  const router = useRouter();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchBatches = useCallback(async () => {
    if (!currentCampus) return;

    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${url}/campus/students/batches`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch batches");
      setBatches(data.batches || []);
    } catch (err) {
      setError(err.message);
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentCampus]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);
  const handlePasswordSubmit = async (enteredPassword) => {
    if (!batchToDelete) return;
    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }

    try {
      const verifyRes = await fetch(`${url}/campus/verify-campus-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: enteredPassword }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setPasswordError(verifyData.message || "Wrong password");
        return;
      }

      const res = await fetch(`${url}/campus/students/batch/${batchToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete batch");

      setBatches((prev) => prev.filter((b) => b !== batchToDelete));
      setBatchToDelete(null);
      setShowPasswordModal(false);
      setPasswordError("");
      await refreshCampus();
      showToast("Batch deleted successfully", "success");
    } catch (err) {
      setPasswordError(err.message || "Failed to delete batch");
      showToast(err.message || "Failed to delete batch");
    }
  };
  useEffect(() => {
    const handleOffline = () => showToast("You are offline");
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  if (!currentCampus) {
    return (
      <p className="p-6 text-center mt-24 text-gray-600">Loading campus...</p>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="min-h-screen text-white pt-20 md:pt-28 px-4 sm:px-6 md:px-20 pb-12">
        {" "}
        <button
          onClick={() => router.push("/campus/students")}
          title="Back to Students"
          className="fixed top-24 left-6 z-20 bg-gray-900/80 hover:bg-gray-800 hover:cursor-pointer text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <IoChevronBackSharp className="w-5 h-5" />
        </button>
        <section className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Student Groups at{" "}
            <span className="text-yellow-400">{currentCampus.name}</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl">
            Manage batches and student groups easily 👥
          </p>
        </section>
        <div className="max-w-4xl mx-auto mb-8 flex justify-end">
          <button
            onClick={fetchBatches}
            className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 shadow-lg transition"
          >
            Refresh Batches
          </button>
        </div>
        <section className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {loading && (
            <p className="text-center col-span-full">Loading batches...</p>
          )}

          {!loading && batches.length === 0 && (
            <p className="text-gray-400 col-span-full text-center">
              No batches found
            </p>
          )}
          {!loading &&
            batches.map((batch) => (
              <div
                key={batch}
                className="bg-gradient-to-tr from-indigo-600/40 to-indigo-500/20 border border-white/10 rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform flex flex-col justify-between"
              >
                <h3 className="text-xl font-bold mb-4">{batch}</h3>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() =>
                      router.push(`/campus/students/groups/batches/${batch}`)
                    }
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    View Students
                  </button>
                  <button
                    onClick={() => {
                      setBatchToDelete(batch);
                      setShowPasswordModal(true);
                    }}
                    className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </section>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
      {showPasswordModal && batchToDelete && (
        <ConfirmCampusPasswordModal
          onCancel={() => {
            setShowPasswordModal(false);
            setBatchToDelete(null);
            setPasswordError("");
          }}
          onConfirm={handlePasswordSubmit}
          errorMessage={passwordError}
        />
      )}
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
