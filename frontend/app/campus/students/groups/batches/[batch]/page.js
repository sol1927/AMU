"use client";

import { React, useEffect, useMemo, useState } from "react";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";
import { usePathname } from "next/navigation";
import { getFastingLabel } from "@/app/utils/studentLabels";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function BatchStudentsPage() {
  const pathname = usePathname();
  const batch = pathname.split("/").pop();
  const { currentCampus } = useCampus();

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
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const [cafes, setCafes] = useState([]);
  const [bulkCafeNumber, setBulkCafeNumber] = useState("");
  const [savingBulkCafeNumber, setSavingBulkCafeNumber] = useState(false);

  const getCafeNum = (name) => {
    if (!name) return null;
    const match = name.match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  const getCafeName = (name) => {
    if (!name) return "Cafe";
    if (/^cafe/i.test(name)) {
      return name.replace(/^cafe/i, "Cafe ").trim();
    }
    const formatted = name.charAt(0).toUpperCase() + name.slice(1);
    return formatted.replace(/([^-\s])(\d+)/g, "$1 $2").trim();
  };

  const getEffectiveStudentCafeNumber = (student) => {
    const explicitCafe = Number(student?.cafeNumber);
    if (explicitCafe === 0) {
      return null;
    }

    if (Number.isInteger(explicitCafe) && explicitCafe > 0) {
      return explicitCafe;
    }

    const batchCafe =
      currentCampus?.batchCafeAssignments?.[String(student?.batch ?? "")];
    const batchCafeNumber = Number(batchCafe);
    return Number.isInteger(batchCafeNumber) && batchCafeNumber > 0
      ? batchCafeNumber
      : null;
  };

  const getStudentCafeLabel = (student) => {
    const cafeNumber = getEffectiveStudentCafeNumber(student);
    if (!cafeNumber) return "Unassigned";
    const matchedCafe = cafes.find(
      (c, index) =>
        (c.cafeNumber || getCafeNum(c.name) || index + 1) === cafeNumber,
    );
    return matchedCafe
      ? matchedCafe.displayName || getCafeName(matchedCafe.name)
      : String(cafeNumber);
  };

  useEffect(() => {
    const fetchCafes = async () => {
      try {
        const res = await fetch("/api/campus/cafes");
        if (res.ok) {
          const data = await res.json();
          setCafes(data.cafes || []);
        }
      } catch (err) {
        console.error("Failed to load cafes:", err);
      }
    };
    fetchCafes();
  }, [currentCampus]);

  const fetchStudentsByBatch = async (
    currentBatch,
    query = "",
    fasting = "",
    department = "",
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);
      if (department) params.append("department", department);

      const res = await fetch(
        `${url}/campus/students/batch/${currentBatch}?${params.toString()}`,
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
  }, [batch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudentsByBatch(batch, searchQuery, fastingFilter, departmentFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [batch, searchQuery, fastingFilter, departmentFilter]);

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
      setBulkCafeNumber("");
    }
  }, [selectedStudents]);

  const handleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const handleBulkCafeNumberUpdate = async () => {
    if (!bulkCafeNumber) return;

    try {
      setSavingBulkCafeNumber(true);
      const nextCafeNumber =
        bulkCafeNumber === "clear" ? 0 : Number(bulkCafeNumber);

      const res = await fetch(`${url}/campus/students/bulk-cafe-number`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedStudents,
          cafeNumber: nextCafeNumber,
        }),
      });

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
        getErrorMessage(err, "We could not update cafe assignments right now."),
        "error",
      );
    } finally {
      setSavingBulkCafeNumber(false);
    }
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
        <div className="mb-3 rounded-3xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold leading-none">Batch {batch}</h1>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                {sortedStudents.length}{" "}
                {sortedStudents.length === 1 ? "student" : "students"}
              </p>
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
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 md:flex-row">
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
              <option className="bg-gray-900 text-white" value="">
                All Fasting Types
              </option>
              <option className="bg-gray-900 text-white" value="fasting">
                Fasting
              </option>
              <option className="bg-gray-900 text-white" value="not_fasting">
                Not Fasting
              </option>
              <option className="bg-gray-900 text-white" value="sunday_fasting">
                Sunday Fasting
              </option>
              <option className="bg-gray-900 text-white" value="muslim_fasting">
                Muslim Fasting
              </option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] truncate"
            >
              <option className="bg-gray-900 text-white" value="">
                All Departments
              </option>
              {departmentOptions.map((department) => {
                const truncatedDept =
                  department.length > 25
                    ? department.slice(0, 22) + "..."
                    : department;
                return (
                  <option
                    key={department}
                    className="bg-gray-900 text-white"
                    value={department}
                    title={department}
                  >
                    {truncatedDept}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedStudents.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={bulkInternshipAction}
                onChange={(e) => setBulkInternshipAction(e.target.value)}
                className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
              >
                <option className="bg-gray-900 text-white" value="">
                  Internship Status
                </option>
                <option className="bg-gray-900 text-white" value="start">
                  Send to Internship
                </option>
                <option className="bg-gray-900 text-white" value="return">
                  Return from Internship
                </option>
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
                className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
              >
                <option className="bg-gray-900 text-white" value="">
                  Select Fasting
                </option>
                <option className="bg-gray-900 text-white" value="fasting">
                  Fasting
                </option>
                <option className="bg-gray-900 text-white" value="not_fasting">
                  Not Fasting
                </option>
                <option
                  className="bg-gray-900 text-white"
                  value="sunday_fasting"
                >
                  Sunday Fasting
                </option>
                <option
                  className="bg-gray-900 text-white"
                  value="muslim_fasting"
                >
                  Muslim Fasting
                </option>
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
                className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
              >
                <option className="bg-gray-900 text-white" value="">
                  Send to Cafe
                </option>
                {cafes.map((c, index) => {
                  const num = c.cafeNumber || getCafeNum(c.name) || index + 1;
                  const displayName = c.displayName || getCafeName(c.name);
                  const truncatedName =
                    displayName.length > 20
                      ? displayName.slice(0, 17) + "..."
                      : displayName;
                  return (
                    <option
                      key={c.id || c._id}
                      className="bg-gray-900 text-white"
                      value={num}
                      title={displayName}
                    >
                      {truncatedName}
                    </option>
                  );
                })}
                <option className="bg-gray-900 text-white" value="clear">
                  Clear Cafe Assignment
                </option>
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

        <div className="mb-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading && <p className="mt-12 text-center">Loading students...</p>}
          {!loading && sortedStudents.length === 0 && initialLoadDone && (
            <p className="mt-12 text-center text-slate-500">
              No students in this batch
            </p>
          )}

          {!loading && sortedStudents.length > 0 && (
            <div className="mb-2 flex items-center gap-4 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500">
              <span className="w-10">#</span>
              <span className="w-9"></span>
              <span className="w-[180px]">Name</span>
              <span className="w-[120px]">Student ID</span>
              <span className="w-[120px]">Department</span>
              <span className="w-[80px]">Batch</span>
              <span className="w-[120px]">Cafe</span>
              <span className="w-[140px]">Fasting</span>
              <span className="w-[120px]">Internship</span>
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
              className="relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 transition-all duration-300 hover:bg-slate-50 hover:shadow-lg sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4"
            >
              <span className="w-10 font-medium text-white">{index + 1}</span>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                {student.profileUrl ? (
                  <img
                    src={student.profileUrl}
                    alt={student.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="font-semibold text-gray-600">
                    {student.name?.[0] || "S"}
                  </span>
                )}
              </div>
              <span className="w-[180px] truncate font-medium">
                {student.name}
              </span>
              <span className="w-[120px] truncate">{student.studentId}</span>
              <span className="w-[120px] truncate">{student.department}</span>
              <span className="w-[80px] truncate">{batch}</span>
              <span
                className="w-[120px] truncate"
                title={getStudentCafeLabel(student)}
              >
                {getStudentCafeLabel(student)}
              </span>
              <span className="w-[140px] truncate">
                {getFastingLabel(student.fastingType)}
              </span>
              <span className="w-[120px]">
                {student.isInternship ? (
                  <span className="font-semibold text-yellow-400">
                    Internship
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </span>
              <div className="ml-auto flex w-6 justify-end">
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
