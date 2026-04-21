"use client";

import { React, useEffect, useMemo, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import { useCampus } from "@/app/context/CampusContext";
import { useRouter } from "next/navigation";
import { getApiMessage, getErrorMessage } from "@/app/utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

const getFastingLabel = (fastingType) => {
  if (fastingType === "fasting") return "Fasting";
  if (fastingType === "sunday_fasting") return "Sunday Fasting";
  if (fastingType === "muslim_fasting") return "Muslim Fasting";
  return "Not Fasting";
};

export default function CampusStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fastingFilter, setFastingFilter] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkFastingType, setBulkFastingType] = useState("");
  const [savingBulkFasting, setSavingBulkFasting] = useState(false);
  const [bulkInternshipAction, setBulkInternshipAction] = useState("");
  const [savingBulkInternship, setSavingBulkInternship] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshingStudents, setRefreshingStudents] = useState(false);

  const router = useRouter();
  const { currentCampus, refreshCampus } = useCampus();

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchStudents = async (query = "", fasting = "") => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);

      const res = await fetch(`${url}/campus/students?${params.toString()}`, {
        credentials: "include",
      });

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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery, fastingFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fastingFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-button")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    setSelectedStudents(filteredAndSortedStudents.map((student) => student._id));
    setSelectAll(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${url}/campus/students/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getApiMessage(data, "We could not delete the student right now."),
        );
      }

      setStudents((prev) => prev.filter((student) => student._id !== id));
      await refreshCampus();
      showToast("Student deleted successfully", "success");
    } catch (err) {
      showToast(
        getErrorMessage(err, "We could not delete the student right now."),
        "error",
      );
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedStudents.map((id) =>
          fetch(`${url}/campus/students/${id}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      );

      setStudents((prev) =>
        prev.filter((student) => !selectedStudents.includes(student._id)),
      );
      setSelectedStudents([]);
      setSelectAll(false);
      await refreshCampus();
      showToast("Selected students deleted successfully", "success");
    } catch {
      showToast("Bulk delete failed", "error");
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

  const handlePasswordSubmit = async (enteredPassword) => {
    try {
      const res = await fetch(`${url}/campus/verify-campus-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: enteredPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(
          getApiMessage(data, "The password you entered is not correct."),
        );
        setTimeout(() => setPasswordError(""), 2000);
        return;
      }

      setShowPasswordModal(false);
      setPasswordError("");

      if (pendingAction === "delete" && studentToDelete) {
        await handleDelete(studentToDelete);
        setStudentToDelete(null);
      } else if (pendingAction === "bulk_delete") {
        await handleBulkDelete();
      }

      setPendingAction(null);
    } catch (error) {
      setPasswordError(
        getErrorMessage(error, "We could not verify your password right now."),
      );
      setTimeout(() => setPasswordError(""), 2000);
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="w-full text-3xl font-bold sm:w-auto">Students</h1>
            <div className="flex items-center gap-2">
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
                onClick={() => router.push("/campus/students/groups")}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700"
              >
                Batch
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="field-surface flex-1 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={fastingFilter}
              onChange={(e) => setFastingFilter(e.target.value)}
              className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">
                All Fasting Types
              </option>
              <option value="fasting">
                Fasting
              </option>
              <option value="not_fasting">
                Not Fasting
              </option>
              <option value="sunday_fasting">
                Sunday Fasting
              </option>
              <option value="muslim_fasting">
                Muslim Fasting
              </option>
            </select>
          </div>

          <div className="mb-3 flex items-center justify-between px-4">
            <p className="font-medium text-slate-500">
              {filteredAndSortedStudents.length}{" "}
              {filteredAndSortedStudents.length === 1 ? "student" : "students"}
            </p>

            {selectedStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={bulkInternshipAction}
                  onChange={(e) => setBulkInternshipAction(e.target.value)}
                  className="field-surface appearance-none rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">
                    Internship Status
                  </option>
                  <option value="start">
                    Send to Internship
                  </option>
                  <option value="return">
                    Return from Internship
                  </option>
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
                  <option value="">
                    Select Fasting
                  </option>
                  <option value="fasting">
                    Fasting
                  </option>
                  <option value="not_fasting">
                    Not Fasting
                  </option>
                  <option value="sunday_fasting">
                    Sunday Fasting
                  </option>
                  <option value="muslim_fasting">
                    Muslim Fasting
                  </option>
                </select>
                {bulkFastingType && (
                  <button
                    disabled={savingBulkFasting}
                    onClick={handleBulkFastingUpdate}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingBulkFasting ? "Saving..." : "Save"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setPendingAction("bulk_delete");
                    setShowPasswordModal(true);
                  }}
                  className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                  Delete ({selectedStudents.length})
                </button>
              </div>
            )}
          </div>

          {!loading && filteredAndSortedStudents.length > 0 && (
            <div className="mb-2 flex items-center gap-4 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500">
              <span className="w-10">#</span>
              <span className="w-9"></span>
              <span className="w-[180px]">Name</span>
              <span className="w-[120px]">Student ID</span>
              <span className="w-[120px]">Department</span>
              <span className="w-[80px]">Batch</span>
              <span className="w-[140px]">Fasting</span>
              <span className="w-[100px]">Internship</span>
              <div className="ml-auto flex items-center gap-2">
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
              className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm"
            >
              <span className="w-10 font-medium text-slate-900">{index + 1}</span>
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
              <span className="w-[80px] truncate">{student.batch}</span>
              <span className="w-[140px] truncate">
                {getFastingLabel(student.fastingType)}
              </span>
              <span className="w-[100px]">
                {student.isInternship ? (
                  <span className="font-semibold text-yellow-400">
                    Internship
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleSelectStudent(student._id)}
                />
                <div className="relative">
                  <button
                    className="rounded p-1 transition hover:bg-slate-100"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === student._id ? null : student._id,
                      )
                    }
                  >
                    <BsThreeDotsVertical className="h-5 w-5 text-slate-500" />
                  </button>

                  {openMenuId === student._id && (
                    <div className="menu-button absolute right-0 top-full z-50 mt-1 w-28 rounded border border-slate-200 bg-white shadow">
                      <button
                        className="block w-full px-3 py-2 text-sm text-red-600 transition hover:rounded hover:bg-red-50"
                        onClick={() => {
                          setStudentToDelete(student._id);
                          setPendingAction("delete");
                          setShowPasswordModal(true);
                          setOpenMenuId(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!loading && initialLoadDone && filteredAndSortedStudents.length === 0 && (
            <p className="mt-12 text-center text-slate-500">Student not found</p>
          )}
        </div>

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>

      {showPasswordModal && (
        <ConfirmCampusPasswordModal
          onCancel={() => {
            setShowPasswordModal(false);
            setPasswordError("");
          }}
          onConfirm={handlePasswordSubmit}
          errorMessage={passwordError}
        />
      )}

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
