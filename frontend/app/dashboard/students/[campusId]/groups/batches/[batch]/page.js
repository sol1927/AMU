"use client";

import { React, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getFastingLabel } from "@/app/utils/studentLabels";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";
import { downloadCsv } from "@/app/utils/exportCsv";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardBatchStudentsPage() {
  const params = useParams();
  const campusId = params?.campusId;
  const batch = params?.batch;

  const [campus, setCampus] = useState(null);
  const [students, setStudents] = useState([]);
  const [allBatchStudents, setAllBatchStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fastingFilter, setFastingFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkFastingType, setBulkFastingType] = useState("");
  const [savingBulkFasting, setSavingBulkFasting] = useState(false);
  const [bulkInternshipAction, setBulkInternshipAction] = useState("");
  const [savingBulkInternship, setSavingBulkInternship] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

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
            getApiMessage(data, "We could not load campuses right now."),
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

    fetchCampus();
  }, [campusId]);

  const fetchStudentsByBatch = async (
    currentBatch,
    query = "",
    fasting = "",
    department = "",
  ) => {
    if (!campusId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);
      if (department) params.append("department", department);

      const res = await fetch(
        `${url}/dashboard/campuses/${campusId}/students/batch/${currentBatch}?${params.toString()}`,
        { credentials: "include" },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not load students right now."),
        );
      }

      setStudents(data.students || []);
      if (!query && !fasting && !department) {
        setAllBatchStudents(data.students || []);
      }
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "We could not load students right now."));
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  useEffect(() => {
    fetchStudentsByBatch(batch);
  }, [campusId, batch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudentsByBatch(batch, searchQuery, fastingFilter, departmentFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [campusId, batch, searchQuery, fastingFilter, departmentFilter]);

  useEffect(() => {
    setDepartmentFilter("");
  }, [batch]);

  const handleRefreshStudents = async () => {
    try {
      setRefreshingStudents(true);
      await fetchStudentsByBatch(
        batch,
        searchQuery,
        fastingFilter,
        departmentFilter,
      );
      showToast("Student list refreshed", "success");
    } finally {
      setRefreshingStudents(false);
    }
  };

  const handleExportStudents = () => {
    if (!campus) return;

    const rows = [
      ["Name", "Student ID", "Department", "Batch", "Fasting", "Internship"],
      ...sortedStudents.map((student) => [
        student.name || "",
        student.studentId || "",
        student.department || "",
        batch || "",
        getFastingLabel(student.fastingType) || "",
        student.isInternship ? "Yes" : "No",
      ]),
    ];

    const safeCampusName = String(campus.name || "campus")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    setExportingStudents(true);
    try {
      downloadCsv(`${safeCampusName}-batch-${batch}-students.csv`, rows);
    } finally {
      setExportingStudents(false);
    }
  };

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [students],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allBatchStudents
            .map((student) => String(student.department || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [allBatchStudents],
  );

  useEffect(() => {
    setSelectAll(
      sortedStudents.length > 0 &&
        selectedStudents.length === sortedStudents.length,
    );
  }, [selectedStudents, sortedStudents]);

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

  const handleBulkFastingUpdate = async () => {
    if (!bulkFastingType || !campusId) return;

    try {
      setSavingBulkFasting(true);

      const res = await fetch(
        `${url}/dashboard/campuses/${campusId}/students/bulk-fasting`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedStudents,
            fastingType: bulkFastingType,
          }),
        },
      );
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
      setAllBatchStudents((prev) =>
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

  const handleBulkInternshipUpdate = async () => {
    if (!bulkInternshipAction || !campusId) return;

    try {
      setSavingBulkInternship(true);
      const nextValue = bulkInternshipAction === "start";

      const res = await fetch(
        `${url}/dashboard/campuses/${campusId}/students/bulk-internship`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedStudents,
            isInternship: nextValue,
          }),
        },
      );
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
      setAllBatchStudents((prev) =>
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

  return (
    <>
      <div className="page-shell mx-auto flex h-screen max-w-7xl flex-col px-6 pt-24 text-slate-900">
        <div className="mb-3 rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl font-bold leading-none">Batch {batch}</h1>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium leading-none text-slate-600">
                {sortedStudents.length}{" "}
                {sortedStudents.length === 1 ? "student" : "students"}
              </p>
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-500 lg:flex-1">
                <span className="rounded-full bg-cyan-100 px-3 py-1 font-semibold text-cyan-700 shadow-sm">
                  {campus?.name || "Loading campus..."}
                </span>
                {campus?.campusId ? (
                  <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    ID {campus.campusId}
                  </span>
                ) : null}
                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 shadow-sm">
                  {campus?.location || "Location not set"}
                </span>
                <span className="rounded-full bg-cyan-50 px-3 py-1 font-semibold text-cyan-700 shadow-sm">
                  Assigned Cafe{" "}
                  {campus?.batchCafeAssignments?.[String(batch)] || "Not set"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                onClick={handleExportStudents}
                disabled={exportingStudents || sortedStudents.length === 0}
                className={`rounded-xl px-4 py-2 text-white shadow-sm transition ${
                  exportingStudents || sortedStudents.length === 0
                    ? "cursor-not-allowed bg-slate-400"
                    : "bg-sky-600 hover:bg-sky-700"
                }`}
              >
                {exportingStudents ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="field-surface min-w-0 flex-1 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={fastingFilter}
              onChange={(e) => setFastingFilter(e.target.value)}
              className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Fasting Types</option>
              <option value="fasting">Fasting</option>
              <option value="not_fasting">Not Fasting</option>
              <option value="sunday_fasting">Sunday Fasting</option>
              <option value="muslim_fasting">Muslim Fasting</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
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
                  className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
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

        <div className="mb-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading && <p className="mt-12 text-center">Loading students...</p>}
          {!loading && sortedStudents.length === 0 && initialLoadDone && (
            <p className="mt-12 text-center text-slate-500">
              No students in this batch
            </p>
          )}

          {!loading && sortedStudents.length > 0 && (
            <div className="mb-2 hidden items-center gap-4 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 sm:flex">
              <span className="w-10">#</span>
              <span className="w-9"></span>
              <span className="w-44">Name</span>
              <span className="w-30">Student ID</span>
              <span className="w-30">Department</span>
              <span className="w-20">Batch</span>
              <span className="w-35">Fasting</span>
              <span className="w-30">Internship</span>
              <div className="ml-auto flex w-6 justify-end">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={() => {
                    if (selectAll) {
                      setSelectedStudents([]);
                      setSelectAll(false);
                      return;
                    }

                    setSelectedStudents(
                      sortedStudents.map((student) => student._id),
                    );
                    setSelectAll(true);
                  }}
                />
              </div>
            </div>
          )}

          {sortedStudents.map((student, index) => (
            <div
              key={student._id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all duration-300 hover:bg-slate-50 hover:shadow-lg sm:grid-cols-[auto_auto_minmax(0,180px)_120px_120px_80px_140px_120px_auto] sm:items-center"
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
                <div className="h-9 w-9 overflow-hidden rounded-full bg-gray-200">
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
                <span className="truncate font-medium">{student.name}</span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Student ID
                </span>
                <span className="truncate">{student.studentId}</span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Department
                </span>
                <span className="truncate">{student.department}</span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Batch
                </span>
                <span className="truncate">{batch}</span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Fasting
                </span>
                <span className="truncate">
                  {getFastingLabel(student.fastingType)}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Internship
                </span>
                <span>
                  {student.isInternship ? (
                    <span className="font-semibold text-yellow-400">
                      Internship
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </span>
              </div>

              <div className="ml-auto flex w-full justify-end sm:w-6">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleSelectStudent(student._id)}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all duration-300 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
