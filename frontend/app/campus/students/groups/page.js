"use client";

import { React, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusStudentGroupsPage() {
  const { currentCampus } = useCampus();
  const router = useRouter();

  const [batches, setBatches] = useState([]);
  const [batchCounts, setBatchCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchBatches = useCallback(async () => {
    if (!currentCampus) return;
    setLoading(true);
    try {
      const [batchesRes, studentsRes] = await Promise.all([
        fetch(`${url}/campus/students/batches`, {
          credentials: "include",
        }),
        fetch(`${url}/campus/students`, {
          credentials: "include",
        }),
      ]);

      const [batchesData, studentsData] = await Promise.all([
        batchesRes.json(),
        studentsRes.json(),
      ]);

      if (!batchesRes.ok) {
        throw new Error(
          getApiMessage(batchesData, "We could not load batches right now."),
        );
      }

      if (!studentsRes.ok) {
        throw new Error(
          getApiMessage(studentsData, "We could not load student counts right now."),
        );
      }

      const nextBatches = batchesData.batches || [];
      const counts = (studentsData.students || []).reduce((accumulator, student) => {
        const batchKey = String(student.batch ?? "");
        if (!batchKey) return accumulator;
        accumulator[batchKey] = (accumulator[batchKey] || 0) + 1;
        return accumulator;
      }, {});

      setBatches(nextBatches);
      setBatchCounts(counts);
      setError("");
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

  if (!currentCampus) {
    return (
      <p className="mt-24 p-6 text-center text-gray-600">Loading campus...</p>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell min-h-screen px-4 pb-12 pt-20 sm:px-6 md:px-20 md:pt-28">
        <section className="mx-auto mb-8 flex max-w-5xl flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="text-center xl:text-left">
            <h1 className="text-2xl font-extrabold md:text-3xl">
              Student Groups at{" "}
              <span className="text-blue-600">{currentCampus.name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600 md:text-base">
              Manage batches and student groups easily
            </p>
          </div>

          <div className="flex justify-center xl:justify-end">
            <button
              onClick={fetchBatches}
              className="app-primary-btn rounded-xl px-5 py-2.5 shadow-lg transition hover:-translate-y-0.5"
            >
              Refresh Batches
            </button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {loading && (
            <p className="col-span-full text-center">Loading batches...</p>
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
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{batch}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {batchCounts[String(batch)] || 0}{" "}
                    {(batchCounts[String(batch)] || 0) === 1 ? "student" : "students"}
                  </p>
                </div>
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/campus/students/groups/batches/${batch}`)
                    }
                    className="flex-1 rounded bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700"
                  >
                    View Students
                  </button>
                </div>
              </div>
            ))}
        </section>

        {error && <p className="mt-4 text-red-600">{error}</p>}
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
    </>
  );
}
