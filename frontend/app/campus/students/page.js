"use client";

import { React, useEffect, useMemo, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";
import { useRouter } from "next/navigation";
import { getFastingLabel } from "@/app/utils/studentLabels";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";
import { downloadCsv } from "@/app/utils/exportCsv";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fastingFilter, setFastingFilter] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkFastingType, setBulkFastingType] = useState("");
  const [savingBulkFasting, setSavingBulkFasting] = useState(false);
  const [bulkInternshipAction, setBulkInternshipAction] = useState("");
  const [savingBulkInternship, setSavingBulkInternship] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);

  const router = useRouter();
  const { currentCampus } = useCampus();

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const [viewMode, setViewMode] = useState("cafe");

  const fetchStudents = async (query = "", fasting = "") => {
    if (!currentCampus) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);

      const endpoint =
        viewMode === "all" ? "/campus/students/all" : "/campus/students";
      const res = await fetch(`${url}${endpoint}?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not load students right now."),
        );
      }

      setStudents(data.students || []);
      setTotalStudents(Number(data.totalStudents) || 0);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "We could not load students right now."));
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  const handleRefreshStudents = async () => {
    try {
      setRefreshingStudents(true);
      await fetchStudents(searchQuery, fastingFilter);
      showToast("Student list refreshed", "success");
    } finally {
      setRefreshingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [currentCampus, viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery, fastingFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fastingFilter]);

  const filteredAndSortedStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return students
      .filter(
        (student) =>
          student.name?.toLowerCase().includes(q) ||
          student.studentId?.toLowerCase().includes(q) ||
          student.department?.toLowerCase().includes(q) ||
          student.batch?.toString().toLowerCase().includes(q),
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [students, searchQuery]);

  useEffect(() => {
    setSelectAll(
      filteredAndSortedStudents.length > 0 &&
        selectedStudents.length === filteredAndSortedStudents.length,
    );
  }, [filteredAndSortedStudents, selectedStudents]);

  useEffect(() => {
    if (selectedStudents.length === 0) {
      setBulkFastingType("");
      setBulkInternshipAction("");
    }
  }, [selectedStudents]);

  const handleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
      setSelectAll(false);
      return;
    }

    setSelectedStudents(
      filteredAndSortedStudents.map((student) => student._id),
    );
    setSelectAll(true);
  };

  const handleBulkFastingUpdate = async () => {
    if (!bulkFastingType) return;

    try {
      setSavingBulkFasting(true);

      const res = await fetch(`${url}/campus/students/bulk-fasting`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedStudents,
          fastingType: bulkFastingType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not update the students right now."),
        );
      }

      setStudents((prev) =>
        prev.map((student) =>
          selectedStudents.includes(student._id)
            ? { ...student, fastingType: bulkFastingType }
            : student,
        ),
      );

      setSelectedStudents([]);
      setSelectAll(false);
      setBulkFastingType("");
      showToast("Fasting status updated successfully", "success");
    } catch (err) {
      showToast(
        getErrorMessage(err, "We could not update the students right now."),
        "error",
      );
    } finally {
      setSavingBulkFasting(false);
    }
  };

  const handleExportCampusStudents = () => {
    if (!currentCampus) return;

    try {
      setExportingStudents(true);

      const rows = [
        [
          "Name",
          "Student ID",
          "Department",
          "Batch",
          "Fasting Type",
          "Internship",
        ],
        ...(viewMode === "all" ? students : filteredAndSortedStudents).map(
          (student) => [
            student.name || "",
            student.studentId || "",
            student.department || "",
            student.batch ?? "",
            student.fastingType || "",
            student.isInternship ? "Yes" : "No",
          ],
        ),
      ];

      const safeCampusName = String(currentCampus?.name || "campus").replace(
        /[^a-z0-9]+/gi,
        "-",
      );
      downloadCsv(
        viewMode === "all"
          ? `${safeCampusName}-campus-all-students.csv`
          : `${safeCampusName}-campus-${currentCampus?.selectedCafeNumber || "all"}-students.csv`,
        rows,
      );
    } finally {
      setExportingStudents(false);
    }
  };

  const handleBulkInternshipUpdate = async () => {
    if (!bulkInternshipAction) return;

    try {
      setSavingBulkInternship(true);

      const nextValue = bulkInternshipAction === "start";

      const res = await fetch(`${url}/campus/students/bulk-internship`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedStudents,
          isInternship: nextValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(
            data,
            "We could not update internship status right now.",
          ),
        );
      }

      setStudents((prev) =>
        prev.map((student) =>
          selectedStudents.includes(student._id)
            ? { ...student, isInternship: nextValue }
            : student,
        ),
      );

      setSelectedStudents([]);
      setSelectAll(false);
      setBulkInternshipAction("");
      showToast(
        nextValue
          ? "Students marked as internship successfully"
          : "Students returned from internship successfully",
        "success",
      );
    } catch (err) {
      showToast(
        getErrorMessage(
          err,
          "We could not update internship status right now.",
        ),
        "error",
      );
    } finally {
      setSavingBulkInternship(false);
    }
  };

  if (!currentCampus) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-slate-200"></div>
          <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell mx-auto flex h-screen max-w-7xl flex-col px-6 pt-24 text-slate-900">
        <div>
          <div className="mb-3 rounded-3xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold leading-none">Students</h1>
                <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  {viewMode === "all" ? (
                    <>
                      Showing {filteredAndSortedStudents.length} campus students
                    </>
                  ) : (
                    <>
                      Showing {filteredAndSortedStudents.length} cafe students
                    </>
                  )}
                </p>
                <p className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                  Campus total: {totalStudents}
                </p>
                {viewMode === "cafe" ? (
                  <p className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                    Cafe {currentCampus?.selectedCafeNumber || "--"}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setViewMode("cafe")}
                  disabled={viewMode === "cafe"}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    viewMode === "cafe"
                      ? "bg-slate-300 text-slate-700 cursor-not-allowed"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Cafe Students
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  disabled={viewMode === "all"}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    viewMode === "all"
                      ? "bg-slate-300 text-slate-700 cursor-not-allowed"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All Students
                </button>
                <button
                  onClick={handleRefreshStudents}
                  disabled={refreshingStudents}
                  className={`rounded-xl px-4 py-2 text-white shadow-sm transition ${
                    refreshingStudents
                      ? "cursor-not-allowed bg-slate-400"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {refreshingStudents ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  onClick={handleExportCampusStudents}
                  disabled={
                    exportingStudents || filteredAndSortedStudents.length === 0
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingStudents
                    ? "Exporting..."
                    : viewMode === "all"
                      ? "Export All Students"
                      : "Export Cafe Students"}
                </button>
                <button
                  onClick={() => router.push("/campus/students/groups")}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700"
                >
                  Batch
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 lg:flex-row">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="field-surface min-w-0 flex-1 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={fastingFilter}
                onChange={(e) => setFastingFilter(e.target.value)}
                className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-56"
              >
                <option value="">All Fasting Types</option>
                <option value="fasting">Fasting</option>
                <option value="not_fasting">Not Fasting</option>
                <option value="sunday_fasting">Sunday Fasting</option>
                <option value="muslim_fasting">Muslim Fasting</option>
              </select>
            </div>

            {selectedStudents.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={bulkInternshipAction}
                  onChange={(e) => setBulkInternshipAction(e.target.value)}
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Internship Status</option>
                  <option value="start">Send to Internship</option>
                  <option value="return">Return from Internship</option>
                </select>
                {bulkInternshipAction && (
                  <button
                    disabled={savingBulkInternship}
                    onClick={handleBulkInternshipUpdate}
                    className="rounded bg-yellow-500 px-3 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {savingBulkInternship ? "Saving..." : "Apply"}
                  </button>
                )}

                <select
                  value={bulkFastingType}
                  onChange={(e) => setBulkFastingType(e.target.value)}
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Fasting</option>
                  <option value="fasting">Fasting</option>
                  <option value="not_fasting">Not Fasting</option>
                  <option value="sunday_fasting">Sunday Fasting</option>
                  <option value="muslim_fasting">Muslim Fasting</option>
                </select>
                {bulkFastingType && (
                  <button
                    disabled={savingBulkFasting}
                    onClick={handleBulkFastingUpdate}
                    className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingBulkFasting ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            )}
          </div>

          {!loading && filteredAndSortedStudents.length > 0 && (
            <div className="mb-2 hidden items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 sm:grid sm:grid-cols-[40px_44px_180px_120px_1fr_70px_130px_100px_24px]">
              <span>#</span>
              <span></span>
              <span className="truncate">Name</span>
              <span className="truncate">Student ID</span>
              <span className="truncate">Department</span>
              <span className="truncate">Batch</span>
              <span className="truncate">Fasting</span>
              <span className="truncate">Internship</span>
              <div className="flex justify-end">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading && <p className="mt-12 text-center">Loading students...</p>}

          {filteredAndSortedStudents.map((student, index) => (
            <div
              key={student._id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:grid-cols-[40px_44px_180px_120px_1fr_70px_130px_100px_24px] sm:items-center"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  #
                </span>
                <span className="font-medium text-slate-900">{index + 1}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Photo
                </span>
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200">
                  {student.profileUrl ? (
                    <img
                      src={student.profileUrl}
                      alt={student.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-semibold text-gray-600">
                      {student.name?.[0] || "S"}
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Name
                </span>
                <span
                  className="block truncate font-medium"
                  title={student.name}
                >
                  {student.name}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Student ID
                </span>
                <span className="block truncate" title={student.studentId}>
                  {student.studentId}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Department
                </span>
                <span className="block truncate" title={student.department}>
                  {student.department}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Batch
                </span>
                <span className="block truncate" title={student.batch}>
                  {student.batch}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Fasting
                </span>
                <span
                  className="block truncate"
                  title={getFastingLabel(student.fastingType)}
                >
                  {getFastingLabel(student.fastingType)}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Internship
                </span>
                <span className="block truncate">
                  {student.isInternship ? (
                    <span className="font-semibold text-yellow-400">
                      Internship
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </span>
              </div>

              <div className="flex w-full justify-end">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleSelectStudent(student._id)}
                />
              </div>
            </div>
          ))}

          {!loading &&
            initialLoadDone &&
            filteredAndSortedStudents.length === 0 && (
              <p className="mt-12 text-center text-slate-500">
                Student not found
              </p>
            )}
        </div>

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
      {toast && (
        <div
          className={`app-toast fixed bottom-4 right-4 rounded-lg px-4 py-3 text-sm transition-all duration-300 sm:bottom-6 sm:right-6 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
