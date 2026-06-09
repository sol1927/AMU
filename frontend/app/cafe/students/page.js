"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { getFastingLabel } from "../../utils/studentLabels";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";
import { downloadCsv } from "../../utils/exportCsv";

const url = process.env.NEXT_PUBLIC_API_URL;

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

export default function CafeStudentsPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cafes, setCafes] = useState([]);

  const getStudentCafeLabel = (student) => {
    const explicitCafe = Number(
      student?.effectiveCafeNumber || student?.cafeNumber,
    );
    const cafeNumber =
      Number.isInteger(explicitCafe) && explicitCafe > 0 ? explicitCafe : null;
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
  }, []);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fastingFilter, setFastingFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [exportingStudents, setExportingStudents] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const activeCafeNum =
    currentUser?.activeCafeNumber || currentUser?.selectedCafeNumber || 1;

  const isAuthorized = currentUser && currentUser.role === "cafe";

  const batchOptions = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((student) => Number(student.batch))
          .filter((batch) => !Number.isNaN(batch) && batch > 0),
      ),
    ).sort((a, b) => a - b);
  }, [students]);

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((student) => String(student.department || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchStudents = async () => {
    if (!isAuthorized) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${url}/campus/students/all?cafeNumber=${activeCafeNum}`,
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
      setTotalStudents(Number(data.totalStudents) || 0);
      setInitialLoadDone(true);
    } catch (err) {
      setError(getErrorMessage(err, "We could not load students right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) {
      if (currentUser !== undefined) router.replace("/");
      return;
    }

    fetchStudents();
  }, [currentUser, isAuthorized, activeCafeNum, router]);

  const filteredAndSortedStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return students
      .filter((student) => {
        const matchesQuery =
          !query ||
          student.name?.toLowerCase().includes(query) ||
          student.studentId?.toLowerCase().includes(query) ||
          student.department?.toLowerCase().includes(query) ||
          String(student.batch || "")
            .toLowerCase()
            .includes(query);

        const matchesFasting =
          !fastingFilter || student.fastingType === fastingFilter;
        const matchesBatch =
          !batchFilter || String(student.batch) === batchFilter;
        const matchesDepartment =
          !departmentFilter ||
          String(student.department || "")
            .trim()
            .toLowerCase() === departmentFilter.trim().toLowerCase();

        return (
          matchesQuery && matchesFasting && matchesBatch && matchesDepartment
        );
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [students, searchQuery, fastingFilter, batchFilter, departmentFilter]);

  const handleRefreshStudents = async () => {
    setRefreshingStudents(true);
    try {
      await fetchStudents();
      showToast("Student list refreshed", "success");
    } finally {
      setRefreshingStudents(false);
    }
  };

  const handleExportStudents = () => {
    if (filteredAndSortedStudents.length === 0) return;

    setExportingStudents(true);
    try {
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

      downloadCsv(`cafe${activeCafeNum}-students.csv`, rows);
    } finally {
      setExportingStudents(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl flex-col overflow-hidden px-6 pt-2 text-slate-900">
      <div className="surface-panel rounded-3xl px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold leading-none text-slate-900">
              Cafe {activeCafeNum} Students
            </h1>
            <p className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              Showing {filteredAndSortedStudents.length} students
            </p>
            <p className="rounded-full bg-sky-50 dark:bg-sky-950/45 px-3 py-1 text-sm font-semibold text-sky-700 dark:text-sky-400">
              Station Cafe {activeCafeNum} Total: {totalStudents}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
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
              type="button"
              onClick={handleExportStudents}
              disabled={
                exportingStudents || filteredAndSortedStudents.length === 0
              }
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingStudents ? "Exporting..." : "Export Students"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="field-surface min-w-0 flex-1 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={fastingFilter}
            onChange={(e) => setFastingFilter(e.target.value)}
            className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-56 max-w-[200px] truncate"
          >
            <option value="">All Fasting Types</option>
            <option value="fasting">Fasting</option>
            <option value="not_fasting">Not Fasting</option>
            <option value="sunday_fasting">Sunday Fasting</option>
            <option value="muslim_fasting">Muslim Fasting</option>
          </select>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-56 max-w-[180px] truncate"
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
            className="field-surface appearance-none rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-56 max-w-[200px] truncate"
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
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {!loading && filteredAndSortedStudents.length > 0 && (
          <div className="mb-2 hidden items-center gap-x-3 gap-y-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 sm:grid sm:grid-cols-[40px_44px_180px_120px_minmax(0,220px)_70px_100px_130px_100px]">
            <span>#</span>
            <span></span>
            <span className="truncate">Name</span>
            <span className="truncate">Student ID</span>
            <span className="truncate">Department</span>
            <span className="truncate">Batch</span>
            <span className="truncate">Cafe</span>
            <span className="truncate">Fasting</span>
            <span className="truncate">Internship</span>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {loading && (
              <p className="mt-12 text-center text-slate-500 dark:text-slate-400">
                Loading students...
              </p>
            )}

            {!loading &&
              filteredAndSortedStudents.length === 0 &&
              initialLoadDone && (
                <p className="mt-12 text-center text-slate-500 dark:text-slate-400">
                  Student not found
                </p>
              )}

            {filteredAndSortedStudents.map((student, index) => (
              <div
                key={student.id}
                className="surface-card grid gap-x-3 gap-y-2 rounded-xl px-4 py-3 sm:grid-cols-[40px_44px_180px_120px_minmax(0,220px)_70px_100px_130px_100px] sm:items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    #
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Photo
                  </span>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                    {student.profileUrl ? (
                      <img
                        src={student.profileUrl}
                        alt={student.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-semibold text-gray-650 dark:text-slate-450">
                        {student.name?.[0] || "S"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Name
                  </span>
                  <span
                    className="block truncate font-medium text-slate-900 dark:text-white"
                    title={student.name}
                  >
                    {student.name}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Student ID
                  </span>
                  <span
                    className="block truncate text-slate-700 dark:text-slate-300"
                    title={student.studentId}
                  >
                    {student.studentId}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Department
                  </span>
                  <span
                    className="block truncate text-slate-700 dark:text-slate-300"
                    title={student.department}
                  >
                    {student.department}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Batch
                  </span>
                  <span
                    className="block truncate text-slate-700 dark:text-slate-300"
                    title={student.batch}
                  >
                    {student.batch}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Cafe
                  </span>
                  <span
                    className="block truncate text-slate-700 dark:text-slate-300"
                    title={getStudentCafeLabel(student)}
                  >
                    {getStudentCafeLabel(student)}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Fasting
                  </span>
                  <span
                    className="block truncate text-slate-700 dark:text-slate-300"
                    title={getFastingLabel(student.fastingType)}
                  >
                    {getFastingLabel(student.fastingType)}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-450 sm:hidden">
                    Internship
                  </span>
                  <span className="block truncate">
                    {student.isInternship ? (
                      <span className="font-semibold text-yellow-500">
                        Internship
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        -
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-650 mt-2">{error}</p>}

      {toast && (
        <div
          className={`app-toast fixed bottom-4 right-4 rounded-lg px-4 py-3 text-sm transition-all duration-300 sm:bottom-6 sm:right-6 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
