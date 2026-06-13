"use client";

import { React, useEffect, useMemo, useRef, useState } from "react";
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
  const [batchFilter, setBatchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedCafe, setSelectedCafe] = useState("");
  const [cafeTotals, setCafeTotals] = useState({});
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkFastingType, setBulkFastingType] = useState("");
  const [savingBulkFasting, setSavingBulkFasting] = useState(false);
  const [bulkInternshipAction, setBulkInternshipAction] = useState("");
  const [savingBulkInternship, setSavingBulkInternship] = useState(false);
  const [bulkCafeNumber, setBulkCafeNumber] = useState("");
  const [savingBulkCafeNumber, setSavingBulkCafeNumber] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);
  const [cafes, setCafes] = useState([]);
  const hasMountedSearch = useRef(false);

  const router = useRouter();
  const { currentCampus } = useCampus();

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const getCafeNum = (name) => {
    if (!name) return null;
    const match = name.match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  const getCafeName = (name) => {
    if (!name) return "";
    // If the name is like "cafe1" or "cafe 1", return a readable label "Cafe 1"
    const cafeNumberMatch = name.match(/^cafe\s*(\d+)$/i);
    if (cafeNumberMatch) {
      return `Cafe ${cafeNumberMatch[1]}`;
    }

    if (/^cafe/i.test(name)) {
      const stripped = name.replace(/^cafe/i, "").trim();
      // If stripping produced only digits (e.g. "1"), prefer "Cafe X"
      if (/^\d+$/.test(stripped)) return `Cafe ${stripped}`;
      return stripped;
    }
    const formatted = name.charAt(0).toUpperCase() + name.slice(1);
    return formatted.replace(/([^-\s])(\d+)/g, "$1 $2").trim();
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

  const getSelectedCafeLabel = (value) => {
    if (value === "unassigned") return "Unassigned";
    const cafe = cafes.find(
      (c, index) =>
        String(c.cafeNumber || getCafeNum(c.name) || index + 1) ===
        String(value),
    );
    return cafe ? cafe.displayName || getCafeName(cafe.name) : `Cafe ${value}`;
  };

  const batchOptions = useMemo(() => {
    const batches = Array.from(
      new Set(
        students
          .map((student) => Number(student.batch))
          .filter((b) => !Number.isNaN(b) && b > 0),
      ),
    ).sort((a, b) => a - b);
    return batches;
  }, [students]);

  const departmentOptions = useMemo(() => {
    const depts = Array.from(
      new Set(
        students
          .map((student) => String(student.department || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    return depts;
  }, [students]);

  const fetchStudents = async (query = "", fasting = "") => {
    if (!currentCampus) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);
      if (selectedCafe) {
        params.append(
          "cafeNumber",
          selectedCafe === "unassigned" ? "0" : selectedCafe,
        );
      }
      params.append("allCafes", "1");
      const endpoint = "/campus/students/all";
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
      setCafeTotals(data.cafeTotals || {});
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
  }, [currentCampus, selectedCafe]);

  useEffect(() => {
    if (!hasMountedSearch.current) {
      hasMountedSearch.current = true;
      return;
    }

    const timer = setTimeout(() => {
      fetchStudents(searchQuery, fastingFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fastingFilter]);

  const filteredAndSortedStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return students
      .filter((student) => {
        // Search query filter
        const matchesSearch =
          !q ||
          student.name?.toLowerCase().includes(q) ||
          student.studentId?.toLowerCase().includes(q) ||
          student.department?.toLowerCase().includes(q) ||
          student.batch?.toString().toLowerCase().includes(q);

        // Batch filter
        const matchesBatch =
          !batchFilter || String(student.batch) === batchFilter;

        // Department filter
        const matchesDept =
          !departmentFilter ||
          String(student.department || "")
            .trim()
            .toLowerCase() === departmentFilter.trim().toLowerCase();

        return matchesSearch && matchesBatch && matchesDept;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [students, searchQuery, batchFilter, departmentFilter]);

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

      const safeCampusName = String(currentCampus?.name || "campus").replace(
        /[^a-z0-9]+/gi,
        "-",
      );
      downloadCsv(`${safeCampusName}-campus-students.csv`, rows);
    } finally {
      setExportingStudents(false);
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
                  Showing {filteredAndSortedStudents.length} students
                </p>
                <p className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                  {selectedCafe ? (
                    <>
                      {getSelectedCafeLabel(selectedCafe)} total:{" "}
                      {selectedCafe === "unassigned"
                        ? totalStudents
                        : cafeTotals[selectedCafe] || 0}
                    </>
                  ) : (
                    `Campus total: ${totalStudents}`
                  )}
                </p>
                <div className="flex gap-2 items-center">
                  <label
                    htmlFor="cafe-select"
                    className="text-sm font-medium text-slate-700"
                  >
                    Cafe:
                  </label>
                  <select
                    id="cafe-select"
                    value={selectedCafe}
                    onChange={(e) => setSelectedCafe(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white w-44 truncate"
                  >
                    <option value="">All Cafes</option>
                    <option value="unassigned">Unassigned</option>
                    {cafes.map((c, index) => {
                      const num =
                        c.cafeNumber || getCafeNum(c.name) || index + 1;
                      const displayName = c.displayName || getCafeName(c.name);
                      const truncatedName =
                        displayName.length > 20
                          ? displayName.slice(0, 17) + "..."
                          : displayName;
                      return (
                        <option
                          key={c.id || c._id}
                          value={num}
                          title={displayName}
                        >
                          {truncatedName}
                        </option>
                      );
                    })}
                  </select>
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
                  onClick={handleExportCampusStudents}
                  disabled={
                    exportingStudents || filteredAndSortedStudents.length === 0
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingStudents ? "Exporting..." : "Export Students"}
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
                <option value="fasting">Orthodox Fasting</option>
                <option value="not_fasting">Not Fasting</option>
                <option value="sunday_fasting">Sunday Fasting</option>
                <option value="muslim_fasting">Muslim Fasting</option>
              </select>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-56"
              >
                <option value="">All Batches</option>
                {batchOptions.map((batch) => (
                  <option key={batch} value={batch}>
                    Batch {batch}
                  </option>
                ))}
              </select>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-56 max-w-[220px] truncate"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((dept) => {
                  const truncatedDept =
                    dept.length > 25 ? dept.slice(0, 22) + "..." : dept;
                  return (
                    <option key={dept} value={dept} title={dept}>
                      {truncatedDept}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedStudents.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 animate-fadeIn">
                <select
                  value={bulkInternshipAction}
                  onChange={(e) => setBulkInternshipAction(e.target.value)}
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
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
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
                >
                  <option value="">Select Fasting</option>
                  <option value="fasting">Orthodox Fasting</option>
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
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
                >
                  <option value="">Send to Cafe</option>
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
                        value={num}
                        title={displayName}
                      >
                        {truncatedName}
                      </option>
                    );
                  })}
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

          {!loading &&
            filteredAndSortedStudents.map((student, index) => (
              <div
                key={student._id}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:grid-cols-[40px_44px_180px_120px_1fr_70px_100px_130px_100px_24px] sm:items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                    #
                  </span>
                  <span className="font-medium text-slate-900">
                    {index + 1}
                  </span>
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
                    Cafe
                  </span>
                  <span
                    className="block truncate"
                    title={getStudentCafeLabel(student)}
                  >
                    {getStudentCafeLabel(student)}
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
                      <span className="font-semibold text-yellow-500">
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
