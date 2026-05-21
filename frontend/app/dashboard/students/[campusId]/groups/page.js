"use client";

import { React, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardCampusStudentGroupsPage() {
  const router = useRouter();
  const params = useParams();
  const campusId = params?.campusId;

  const [campus, setCampus] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchCounts, setBatchCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [availableCafeNumbers, setAvailableCafeNumbers] = useState([1]);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchBatches = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (!campusId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else if (isFirstLoad.current) {
        setLoading(true);
      }

      try {
        const [campusesRes, batchesRes, studentsRes] = await Promise.all([
          fetch(`${url}/dashboard/campuses`, { credentials: "include" }),
          fetch(`${url}/dashboard/campuses/${campusId}/students/batches`, {
            credentials: "include",
          }),
          fetch(`${url}/dashboard/campuses/${campusId}/students`, {
            credentials: "include",
          }),
        ]);

        const [campusesData, batchesData, studentsData] = await Promise.all([
          campusesRes.json(),
          batchesRes.json(),
          studentsRes.json(),
        ]);

        if (!campusesRes.ok) {
          throw new Error(
            getApiMessage(campusesData, "We could not load campuses right now."),
          );
        }

        if (!batchesRes.ok) {
          throw new Error(
            getApiMessage(batchesData, "We could not load batches right now."),
          );
        }

        if (!studentsRes.ok) {
          throw new Error(
            getApiMessage(
              studentsData,
              "We could not load student counts right now.",
            ),
          );
        }

        const matchedCampus = (campusesData.campuses || []).find(
          (item) => String(item._id ?? item.id) === String(campusId),
        );

        if (!matchedCampus) {
          throw new Error("Campus not found.");
        }

        const nextBatches = batchesData.batches || [];
        const counts = (studentsData.students || []).reduce(
          (accumulator, student) => {
            const batchKey = String(student.batch ?? "");
            if (!batchKey) return accumulator;
            accumulator[batchKey] = (accumulator[batchKey] || 0) + 1;
            return accumulator;
          },
          {},
        );

        setCampus(matchedCampus);
        setBatches(nextBatches);
        setBatchCounts(counts);
        setAvailableCafeNumbers(
          batchesData.cafeNumbers || matchedCampus.cafeNumbers || [1],
        );
        setError("");
      } catch (err) {
        const message = getErrorMessage(
          err,
          "We could not load batches right now.",
        );
        setError(message);
        showToast(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFirstLoad.current = false;
        setInitialLoadDone(true);
      }
    },
    [campusId],
  );

  useEffect(() => {
    isFirstLoad.current = true;
    setInitialLoadDone(false);
    setLoading(true);
    fetchBatches();
  }, [campusId, fetchBatches]);

  return (
    <>
      <div className="page-shell min-h-screen px-4 pb-12 pt-20 sm:px-6 md:px-20 md:pt-28">
        <div className="mx-auto max-w-5xl">
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-2 xl:justify-start">
                  <span className="rounded-full bg-cyan-100 px-3 py-1 font-semibold text-cyan-700 shadow-sm">
                    {campus?.name || "Loading campus..."}
                  </span>
                  {campus?.campusId ? (
                    <span className="rounded-full bg-cyan-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      ID {campus.campusId}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 shadow-sm">
                    {campus?.location || "Location not set"}
                  </span>
                </div>

                <div className="text-center xl:text-left">
                  <h1 className="text-3xl font-extrabold md:text-4xl">
                    Student Groups
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 md:text-base">
                    Manage batches and student groups from the admin dashboard
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 xl:justify-start">
                    {availableCafeNumbers.map((number) => (
                      <span
                        key={number}
                        className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700"
                      >
                        Cafe {number}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center xl:justify-end">
                <button
                  onClick={() => fetchBatches({ isRefresh: true })}
                  disabled={refreshing}
                  className="app-primary-btn rounded-xl px-6 py-3 shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {refreshing ? "Refreshing..." : "Refresh Batches"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {loading && !initialLoadDone && (
              <p className="col-span-full text-center">Loading batches...</p>
            )}

            {initialLoadDone && !loading && batches.length === 0 && (
              <p className="col-span-full text-center text-slate-500">
                No batches found
              </p>
            )}

            {initialLoadDone &&
              batches.map((batchItem) => (
                <div
                  key={batchItem.batch}
                  className="surface-card flex flex-col justify-between rounded-2xl p-6 transition-transform hover:-translate-y-1"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold">{batchItem.batch}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {batchCounts[String(batchItem.batch)] ||
                        batchItem.studentCount ||
                        0}{" "}
                      {(batchCounts[String(batchItem.batch)] ||
                        batchItem.studentCount ||
                        0) === 1
                        ? "student"
                        : "students"}
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/students/${campusId}/groups/batches/${batchItem.batch}`,
                        )
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
