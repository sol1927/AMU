"use client";

import { React, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import { useCampus } from "@/app/context/CampusContext";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

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
    setLoading(true);
    try {
      const res = await fetch(`${url}/campus/students/batches`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not load batches right now."),
        );
      }
      setBatches(data.batches || []);
    } catch (err) {
      const message = getErrorMessage(err, "We could not load batches right now.");
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  }, [currentCampus]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);
  const handlePasswordSubmit = async (enteredPassword) => {
    if (!batchToDelete) return;
    try {
      const verifyRes = await fetch(`${url}/campus/verify-campus-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: enteredPassword }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setPasswordError(
          getApiMessage(verifyData, "The password you entered is not correct."),
        );
        return;
      }

      const res = await fetch(`${url}/campus/students/batch/${batchToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not delete the batch right now."),
        );
      }

      setBatches((prev) => prev.filter((b) => b !== batchToDelete));
      setBatchToDelete(null);
      setShowPasswordModal(false);
      setPasswordError("");
      await refreshCampus();
      showToast("Batch deleted successfully", "success");
    } catch (err) {
      const message = getErrorMessage(
        err,
        "We could not delete the batch right now.",
      );
      setPasswordError(message);
      showToast(message);
    }
  };

  if (!currentCampus) {
    return (
      <p className="p-6 text-center mt-24 text-gray-600">Loading campus...</p>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell min-h-screen px-4 pb-12 pt-20 sm:px-6 md:px-20 md:pt-28">
        <section className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Student Groups at{" "}
            <span className="text-blue-600">{currentCampus.name}</span>
          </h1>
          <p className="text-lg text-slate-600 md:text-xl">
            Manage batches and student groups easily 👥
          </p>
        </section>
        <div className="max-w-4xl mx-auto mb-8 flex justify-end">
          <button
            onClick={fetchBatches}
            className="app-primary-btn rounded-xl px-6 py-3 shadow-lg transition hover:-translate-y-0.5"
          >
            Refresh Batches
          </button>
        </div>
        <section className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {loading && (
            <p className="text-center col-span-full">Loading batches...</p>
          )}

          {!loading && batches.length === 0 && (
            <p className="col-span-full text-center text-slate-500">
              No batches found
            </p>
          )}
          {!loading &&
            batches.map((batch) => (
              <div
                key={batch}
                className="surface-card flex flex-col justify-between rounded-2xl p-6 transition-transform hover:-translate-y-1"
              >
                <h3 className="text-xl font-bold mb-4">{batch}</h3>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() =>
                      router.push(`/campus/students/groups/batches/${batch}`)
                    }
                    className="flex-1 rounded bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700"
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
          className={`app-toast fixed bottom-6 right-6 rounded-xl px-4 py-2 transition ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
