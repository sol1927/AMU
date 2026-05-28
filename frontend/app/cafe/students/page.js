"use client";

import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { useEffect, useState, useMemo } from "react";
import { HiOutlineSearch, HiOutlineUserGroup } from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CafeStudentsPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cafeNumbers, setCafeNumbers] = useState([1]);
  const [selectedCafe, setSelectedCafe] = useState("");
  const [totalStudents, setTotalStudents] = useState(0);
  const isCafeManager = currentUser?.role === "cafe manager";

  useEffect(() => {
    if (!currentUser || !["cafe", "cafe manager"].includes(currentUser.role)) {
      router.replace("/");
      return;
    }

    if (isCafeManager) return;

    // Fetch cafe numbers for dropdown
    const fetchCafeNumbers = async () => {
      try {
        const res = await fetch(`${url}/cafe/cafe-numbers`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCafeNumbers(
            Array.isArray(data.cafeNumbers) ? data.cafeNumbers : [1],
          );
        }
      } catch {
        setCafeNumbers([1]);
      }
    };
    fetchCafeNumbers();
  }, [currentUser, isCafeManager, router]);

  useEffect(() => {
    if (!currentUser || !["cafe", "cafe manager"].includes(currentUser.role)) {
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (!isCafeManager && selectedCafe) params.append("cafeNumber", selectedCafe);
    params.append("allCafes", "1");
    fetch(`${url}/campus/students/all?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setTotalStudents(Number(data.totalStudents) || 0);
      })
      .finally(() => setLoading(false));
  }, [currentUser, isCafeManager, selectedCafe]);

  const handleFastingChange = async (studentId, value) => {
    try {
      const res = await fetch(`${url}/cafe/students/bulk-fasting`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [studentId], fastingType: value }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId ? { ...s, fastingType: value } : s,
          ),
        );
      }
    } catch {}
  };

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.department &&
            student.department
              .toLowerCase()
              .includes(searchTerm.toLowerCase())),
      ),
    [students, searchTerm],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Designated Students
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isCafeManager
              ? "Showing students across all cafes"
              : selectedCafe
              ? `Showing students assigned to Cafe ${selectedCafe}`
              : "Showing all students in all cafes"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50/50 px-4 py-2 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <HiOutlineUserGroup className="h-5 w-5" />
          <span className="font-semibold">
            {filteredStudents.length} / {totalStudents} Total
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <HiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by name, ID, or department..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-950"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!isCafeManager && (
          <div className="flex gap-2 items-center">
            <label
              htmlFor="cafe-select"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cafe:
            </label>
            <select
              id="cafe-select"
              value={selectedCafe}
              onChange={(e) => setSelectedCafe(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="">All Cafes</option>
              {cafeNumbers.map((num) => (
                <option key={num} value={num}>{`Cafe ${num}`}</option>
              ))}
            </select>
          </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800"></div>
            <p className="text-slate-500 mt-4 text-sm">
              Loading student list...
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 dark:border-slate-800">
            <p className="text-slate-400 text-sm">
              {searchTerm
                ? "No students found matching your search."
                : "No students assigned to this cafe station."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600 dark:text-slate-400">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 font-semibold text-slate-900 dark:text-white">
                    Name
                  </th>
                  <th className="py-3 font-semibold text-slate-900 dark:text-white">
                    Student ID
                  </th>
                  <th className="py-3 font-semibold text-slate-900 dark:text-white">
                    Department
                  </th>
                  <th className="py-3 font-semibold text-slate-900 dark:text-white text-center">
                    Batch
                  </th>
                  <th className="py-3 font-semibold text-slate-900 dark:text-white text-right">
                    Fasting Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                  >
                    <td className="py-3 font-medium text-slate-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="py-3 font-mono">{student.studentId}</td>
                    <td className="py-3">{student.department || "N/A"}</td>
                    <td className="py-3 text-center">{student.batch}</td>
                    <td className="py-3 text-right">
                      <select
                        value={student.fastingType || "not_fasting"}
                        onChange={(e) =>
                          handleFastingChange(student.id, e.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        <option value="not_fasting">Not Fasting</option>
                        <option value="fasting">Regular Fasting</option>
                        <option value="sunday_fasting">Sunday Fasting</option>
                        <option value="muslim_fasting">Muslim Fasting</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
