"use client";

import { useEffect, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import { useCampus } from "@/app/context/CampusContext";
import { useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusStudentGroupsPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");

  const { currentCampus, refreshCampus } = useCampus();
  const router = useRouter();

  // Fetch all batches
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${url}/campus/students/batches`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBatches(data.batches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  /* ---------------- Delete batch with password confirmation ---------------- */
  const handlePasswordSubmit = async (enteredPassword) => {
    if (!batchToDelete) return;

    try {
      // Verify campus password first
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

      // Password correct → delete batch
      const res = await fetch(`${url}/campus/students/batch/${batchToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Refresh batch list
      setBatches((prev) => prev.filter((b) => b !== batchToDelete));
      setBatchToDelete(null);
      setShowPasswordModal(false);
      setPasswordError("");
      await refreshCampus();
    } catch (err) {
      setPasswordError(err.message || "Failed to delete batch");
    }
  };

  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />
      <div className="pt-24 h-screen max-w-5xl mx-auto px-6 flex flex-col">
        <h1 className="text-3xl font-bold mb-6">Student Groups</h1>

        {loading && <p className="text-center mt-12">Loading batches...</p>}

        {!loading && batches.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {batches.map((batch) => (
              <div key={batch} className="flex gap-2">
                {/* Navigate to batch students */}
                <button
                  onClick={() =>
                    router.push(`/campus/students/groups/batches/${batch}`)
                  }
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  {batch}
                </button>

                {/* Delete batch button */}
                <button
                  onClick={() => {
                    setBatchToDelete(batch);
                    setShowPasswordModal(true);
                  }}
                  className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && batches.length === 0 && (
          <p className="text-center text-gray-500 mt-12">No batches found</p>
        )}

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>

      {/* Password confirmation modal */}
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
    </>
  );
}
