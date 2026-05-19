"use client";

import { React, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFastingLabel } from "@/app/utils/studentLabels";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";
import { downloadCsv } from "@/app/utils/exportCsv";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardCampusStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const campusId = params?.campusId;

  const [campus, setCampus] = useState(null);
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
  const [bulkCafeNumber, setBulkCafeNumber] = useState("");
  const [savingBulkCafeNumber, setSavingBulkCafeNumber] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const cafeNumbers = useMemo(
    () => campus?.cafeNumbers || [1],
    [campus?.cafeNumbers],
  );

  const getEffectiveStudentCafeNumber = (student) => {
    const explicitCafe = Number(student?.cafeNumber);
    if (explicitCafe === 0) {
      return null;
    }

    if (Number.isInteger(explicitCafe) && explicitCafe > 0) {
      return explicitCafe;
    }

    const batchCafe = campus?.batchCafeAssignments?.[
      String(student?.batch ?? "")
    ];
    const batchCafeNumber = Number(batchCafe);
    return Number.isInteger(batchCafeNumber) && batchCafeNumber > 0
      ? batchCafeNumber
      : null;
  };

  const getStudentCafeLabel = (student) => {
    const cafeNumber = getEffectiveStudentCafeNumber(student);
    return cafeNumber ? `Cafe ${cafeNumber}` : "Unassigned";
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

  const fetchStudents = async (query = "", fasting = "") => {
    if (!campusId) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);

      const res = await fetch(
        `${url}/dashboard/campuses/${campusId}/students?${params.toString()}`,
        { credentials: "include" },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not load students right now."),
        );
      }

      setStudents(data.students || []);
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
  }, [campusId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery, fastingFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [campusId, searchQuery, fastingFilter]);

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
      setBulkCafeNumber("");
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

  const handleExportStudents = () => {
    try {
      setExportingStudents(true);

      const rows = [
        [
          "Name",
          "Student ID",
          "Department",
          "Batch",
          "Cafe",
          "Fasting Type",
          "Internship",
        ],
        ...filteredAndSortedStudents.map((student) => [
          student.name || "",
          student.studentId || "",
          student.department || "",
          student.batch ?? "",
          getStudentCafeLabel(student),
          student.fastingType || "",
          student.isInternship ? "Yes" : "No",
        ]),
      ];

      const safeCampusName = String(campus?.name || "campus").replace(
        /[^a-z0-9]+/gi,
        "-",
      );
      downloadCsv(`${safeCampusName}-${campusId}-students.csv`, rows);
    } finally {
      setExportingStudents(false);
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

  const handleBulkCafeNumberUpdate = async () => {
    if (!bulkCafeNumber || !campusId) return;

    try {
      setSavingBulkCafeNumber(true);
      const nextCafeNumber =
        bulkCafeNumber === "clear" ? 0 : Number(bulkCafeNumber);

      const res = await fetch(
        `${url}/dashboard/campuses/${campusId}/students/bulk-cafe-number`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedStudents,
            cafeNumber: nextCafeNumber,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          getApiMessage(
            data,
            "We could not update cafe assignments right now.",
          ),
        );
      }

      setStudents((prev) =>
        prev.map((student) =>
          selectedStudents.includes(student._id)
            ? { ...student, cafeNumber: nextCafeNumber }
            : student,
        ),
      );

      setSelectedStudents([]);
      setSelectAll(false);
      setBulkCafeNumber("");
      showToast(
        nextCafeNumber
          ? `Students sent to Cafe ${nextCafeNumber} successfully`
          : "Student cafe assignments cleared successfully",
        "success",
      );
    } catch (err) {
      showToast(
        getErrorMessage(
          err,
          "We could not update cafe assignments right now.",
        ),
        "error",
      );
    } finally {
      setSavingBulkCafeNumber(false);
    }
  };

  return (
    <>
      <div className="page-shell mx-auto flex h-screen max-w-7xl flex-col px-6 pt-24 text-slate-900">
        <div>
          <div className="mb-3 rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-bold leading-none">Students</h1>
                <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium leading-none text-slate-600">
                  {filteredAndSortedStudents.length}{" "}
                  {filteredAndSortedStudents.length === 1
                    ? "student"
                    : "students"}
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
                  disabled={
                    exportingStudents || filteredAndSortedStudents.length === 0
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingStudents ? "Exporting..." : "Export CSV"}
                </button>
                <button
                  onClick={() =>
                    router.push(`/dashboard/students/${campusId}/groups`)
                  }
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700"
                >
                  Batch
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 lg:flex-row">
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

                <select
                  value={bulkCafeNumber}
                  onChange={(e) => setBulkCafeNumber(e.target.value)}
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Send to Cafe</option>
                  {cafeNumbers.map((cafeNumber) => (
                    <option key={cafeNumber} value={cafeNumber}>
                      Cafe {cafeNumber}
                    </option>
                  ))}
                  <option value="clear">Clear Cafe Assignment</option>
                </select>
                {bulkCafeNumber && (
                  <button
                    disabled={savingBulkCafeNumber}
                    onClick={handleBulkCafeNumberUpdate}
                    className="rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {savingBulkCafeNumber ? "Saving..." : "Send"}
                  </button>
                )}
              </div>
            )}
          </div>

          {!loading && filteredAndSortedStudents.length > 0 && (
            <div className="mb-2 hidden items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 sm:grid sm:grid-cols-[40px_44px_180px_120px_1fr_70px_100px_130px_100px_24px]">
              <span>#</span>
              <span></span>
              <span className="truncate">Name</span>
              <span className="truncate">Student ID</span>
              <span className="truncate">Department</span>
              <span className="truncate">Batch</span>
              <span className="truncate">Cafe</span>
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
              className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:grid-cols-[40px_44px_180px_120px_1fr_70px_100px_130px_100px_24px] sm:items-center"
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
                <span className="block truncate font-medium" title={student.name}>
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
                  Cafe
                </span>
                <span className="block truncate" title={getStudentCafeLabel(student)}>
                  {getStudentCafeLabel(student)}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                  Fasting
                </span>
                <span className="block truncate" title={getFastingLabel(student.fastingType)}>
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

              <div className="ml-auto flex w-full justify-end sm:w-6">
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
