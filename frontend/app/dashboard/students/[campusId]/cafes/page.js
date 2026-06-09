"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

const getCampusCafes = (campus) => {
  if (Array.isArray(campus?.cafes) && campus.cafes.length > 0) {
    return [...campus.cafes]
      .map((cafe, index) => ({
        cafeNumber: Number(cafe.cafeNumber) || index + 1,
        displayName:
          cafe.displayName ||
          cafe.name ||
          `Cafe ${Number(cafe.cafeNumber) || index + 1}`,
      }))
      .sort((a, b) => a.cafeNumber - b.cafeNumber);
  }

  if (Array.isArray(campus?.cafeNumbers) && campus.cafeNumbers.length > 0) {
    return campus.cafeNumbers.map((cafeNumber) => ({
      cafeNumber: Number(cafeNumber),
      displayName: `Cafe ${cafeNumber}`,
    }));
  }

  if (Number.isInteger(campus?.cafeCount) && campus.cafeCount > 0) {
    return Array.from({ length: campus.cafeCount }, (_, index) => ({
      cafeNumber: index + 1,
      displayName: `Cafe ${index + 1}`,
    }));
  }

  return [{ cafeNumber: 1, displayName: "Cafe 1" }];
};

const getEffectiveStudentCafeNumber = (student, campus) => {
  const explicitCafe = Number(student?.cafeNumber);
  if (explicitCafe === 0) {
    return null;
  }

  if (Number.isInteger(explicitCafe) && explicitCafe > 0) {
    return explicitCafe;
  }

  const batchCafe =
    campus?.batchCafeAssignments?.[String(student?.batch ?? "")];
  const batchCafeNumber = Number(batchCafe);
  return Number.isInteger(batchCafeNumber) && batchCafeNumber > 0
    ? batchCafeNumber
    : null;
};

export default function DashboardCampusCafeViewPage() {
  const router = useRouter();
  const params = useParams();
  const campusId = params?.campusId;

  const [campus, setCampus] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const campusCafes = useMemo(() => getCampusCafes(campus), [campus]);

  const cafeTotals = useMemo(() => {
    const totals = Object.fromEntries(
      campusCafes.map((cafe) => [cafe.cafeNumber, 0]),
    );
    let unassigned = 0;

    students.forEach((student) => {
      const cafeNumber = getEffectiveStudentCafeNumber(student, campus);
      if (cafeNumber && totals[cafeNumber] !== undefined) {
        totals[cafeNumber] += 1;
      } else {
        unassigned += 1;
      }
    });

    return { totals, unassigned };
  }, [campusCafes, campus, students]);

  useEffect(() => {
    const fetchCampus = async () => {
      if (!campusId) return;

      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            getApiMessage(data, "We could not load campus details right now."),
          );
        }

        const matchedCampus = (data.campuses || []).find(
          (item) => item._id === campusId,
        );

        if (!matchedCampus) {
          throw new Error("Campus not found.");
        }

        setCampus(matchedCampus);
      } catch (err) {
        setError(
          getErrorMessage(err, "We could not load campus details right now."),
        );
      }
    };

    const fetchStudents = async () => {
      if (!campusId) return;

      try {
        const res = await fetch(
          `${url}/dashboard/campuses/${campusId}/students`,
          { credentials: "include" },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            getApiMessage(data, "We could not load students right now."),
          );
        }

        setStudents(data.students || []);
      } catch (err) {
        setError(getErrorMessage(err, "We could not load students right now."));
      } finally {
        setLoading(false);
      }
    };

    fetchCampus();
    fetchStudents();
  }, [campusId]);

  const getCafeDisplayName = (cafeNumber) => {
    const matchedCafe = campusCafes.find(
      (cafe) => Number(cafe.cafeNumber) === Number(cafeNumber),
    );
    return matchedCafe?.displayName || `Cafe ${cafeNumber}`;
  };

  const handleOpenCafe = (cafeNumber) => {
    router.push(`/dashboard/students/${campusId}?cafeNumber=${cafeNumber}`);
  };

  const handleOpenAllStudents = () => {
    router.push(`/dashboard/students/${campusId}`);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const res = await fetch(
        `${url}/dashboard/campuses/${campusId}/students`,
        {
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not load students right now."),
        );
      }
      setStudents(data.students || []);
      showToast("Student counts refreshed", "success");
    } catch (err) {
      setError(
        getErrorMessage(err, "We could not refresh students right now."),
      );
      showToast(
        getErrorMessage(err, "We could not refresh students right now."),
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="page-shell px-4 pb-10 pt-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="surface-panel rounded-[30px] p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
                Student Control
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Students by Cafe
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
                Choose a cafe to view students assigned to it using campus cafe
                metadata display names.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh Counts"}
              </button>
              <button
                type="button"
                onClick={handleOpenAllStudents}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                View All Students
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/students/${campusId}/groups`)
                }
                className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Open Batches
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-3xl bg-rose-50 p-5 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 justify-items-center md:grid-cols-2 xl:grid-cols-3">
          <div className="surface-card rounded-[28px] p-3 w-full max-w-sm transition hover:-translate-y-1 hover:border-cyan-300">
            <p className="text-sm text-slate-600">All Students</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {students.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Total students across the campus.
            </p>
            <button
              type="button"
              onClick={handleOpenAllStudents}
              className="mt-3 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-2.5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Open Students
            </button>
          </div>

          {campusCafes.map((cafe) => (
            <div
              key={cafe.cafeNumber}
              className="surface-card rounded-[28px] p-3 w-full max-w-sm transition hover:-translate-y-1 hover:border-cyan-300"
            >
              <p className="text-sm text-slate-600">{cafe.displayName}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {cafeTotals.totals[cafe.cafeNumber] ?? 0}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Assigned students for this cafe.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCafe(cafe.cafeNumber)}
                className="mt-3 inline-flex items-center justify-center rounded-2xl bg-white px-2.5 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                View {cafe.displayName}
              </button>
            </div>
          ))}

          <div className="surface-card rounded-[28px] p-3 w-full max-w-sm transition hover:-translate-y-1 hover:border-cyan-300">
            <p className="text-sm text-slate-600">Unassigned Students</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {cafeTotals.unassigned}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Students without a final cafe assignment.
            </p>
            <button
              type="button"
              onClick={handleOpenAllStudents}
              className="mt-3 inline-flex items-center justify-center rounded-2xl bg-white px-2.5 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              View All Students
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-4 right-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
