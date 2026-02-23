"use client";

import { useEffect, useState, useMemo } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import EditStudentModal from "@/app/components/EditStudentModal";
import { useCampus } from "@/app/context/CampusContext";
import { usePathname, useRouter } from "next/navigation";
import { IoChevronBackSharp } from "react-icons/io5";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function BatchStudentsPage() {
  const pathname = usePathname();
  const batch = pathname.split("/").pop(); // get batch from URL
  const router = useRouter();

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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "edit" | "delete" | "bulk_delete"
  const [studentToEditData, setStudentToEditData] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const { currentCampus, refreshCampus } = useCampus();

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  /* ---------------- Fetch students ---------------- */
  const fetchStudentsByBatch = async (batch, query = "", fasting = "") => {
    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (fasting) params.append("fastingType", fasting);

      const res = await fetch(
        `${url}/campus/students/batch/${batch}?${params.toString()}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
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
      fetchStudentsByBatch(batch, searchQuery, fastingFilter);
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fastingFilter]);

  // Detect offline automatically
  useEffect(() => {
    const handleOffline = () => showToast("You are offline");
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  /* ---------------- Outside click for menu ---------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-button")) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- Password & delete/edit handlers ---------------- */
  const handlePasswordSubmit = async (enteredPassword) => {
    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }

    try {
      const res = await fetch(`${url}/campus/verify-campus-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: enteredPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.message || "Wrong password");
        setTimeout(() => setPasswordError(""), 2000);
        return;
      }

      setShowPasswordModal(false);
      setPasswordError("");

      if (pendingAction === "delete" && studentToDelete) {
        await handleDelete(studentToDelete);
        setStudentToDelete(null);
      } else if (pendingAction === "edit" && studentToEditData) {
        setShowEditModal(true);
      } else if (pendingAction === "bulk_delete") {
        await handleBulkDelete();
      }

      setPendingAction(null);
    } catch (err) {
      setPasswordError("Something went wrong");
      setTimeout(() => setPasswordError(""), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }

    try {
      const res = await fetch(`${url}/campus/students/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      setStudents((prev) => prev.filter((s) => s._id !== id));
      await refreshCampus();
      showToast("Student deleted successfully", "success");
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }

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
        prev.filter((s) => !selectedStudents.includes(s._id)),
      );
      setSelectedStudents([]);
      setSelectAll(false);
      setBulkFastingType("");
      await refreshCampus();
      showToast("Selected students deleted successfully", "success");
    } catch (err) {
      showToast("Bulk delete failed", "error");
    }
  };

  const handleBulkFastingUpdate = async () => {
    if (!bulkFastingType) return;
    if (!navigator.onLine) {
      showToast("No internet connection");
      return;
    }
    setSavingBulkFasting(true);

    try {
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
      if (!res.ok) throw new Error(data.message);

      setStudents((prev) =>
        prev.map((s) =>
          selectedStudents.includes(s._id)
            ? { ...s, fastingType: bulkFastingType }
            : s,
        ),
      );

      setSelectedStudents([]);
      setSelectAll(false);
      setBulkFastingType("");
      showToast("Fasting status updated successfully", "success");
    } catch (err) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setSavingBulkFasting(false);
    }
  };

  /* ---------------- Selection helpers ---------------- */
  const handleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [students]);

  useEffect(() => {
    setSelectAll(
      selectedStudents.length > 0 &&
        selectedStudents.length === sortedStudents.length,
    );
    if (selectedStudents.length === 0) setBulkFastingType("");
  }, [selectedStudents, sortedStudents]);

  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />
      <div className="pt-24 h-screen text-white max-w-7xl mx-auto px-6 flex flex-col">
        <button
          onClick={() => router.push("/campus/students/groups")}
          title="Back to Batches"
          className="fixed top-24 left-6 z-20 bg-gray-900/80 hover:bg-gray-800 hover:cursor-pointer text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <IoChevronBackSharp className="w-5 h-5" />
        </button>

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Batch {batch}</h1>
        </div>

        {/* Search & fasting filter */}
        <div className="flex gap-2 mb-4">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="flex-1 p-2 bg-white/5 border border-white/10 rounded-xl text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={fastingFilter}
            onChange={(e) => setFastingFilter(e.target.value)}
            className="p-2 bg-white/5 border border-white/10 rounded-xl text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
        </div>

        {/* Header above table */}
        <div className="flex justify-between items-center mb-3 px-4">
          <p className="text-gray-300 font-medium">
            {sortedStudents.length}{" "}
            {sortedStudents.length === 1 ? "student" : "students"}
          </p>
          {selectedStudents.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPendingAction("bulk_delete");
                  setShowPasswordModal(true);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete ({selectedStudents.length})
              </button>
              <select
                value={bulkFastingType}
                onChange={(e) => setBulkFastingType(e.target.value)}
                className="p-2 bg-white/5 border border-white/10 rounded-xl text-white backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {savingBulkFasting ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Students list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {loading && <p className="text-center mt-12">Loading students...</p>}
          {!loading && sortedStudents.length === 0 && initialLoadDone && (
            <p className="text-center text-gray-500 mt-12">
              No students in this batch
            </p>
          )}

          {/* Column Header */}
          {!loading && sortedStudents.length > 0 && (
            <div className="flex items-center gap-4 text-gray-400 text-sm font-medium px-4 py-3 mb-2 bg-white/5 rounded border border-white/10">
              <span className="w-10">#</span>
              <span className="w-9"></span> {/* Space for avatar */}
              <span className="w-[180px]">Name</span>
              <span className="w-[120px]">Student ID</span>
              <span className="w-[120px]">Department</span>
              <span className="w-[80px]">Batch</span>
              <span className="w-[140px]">Fasting</span>
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={() => {
                    if (selectAll) {
                      setSelectedStudents([]);
                    } else {
                      setSelectedStudents(sortedStudents.map((s) => s._id));
                    }
                    setSelectAll(!selectAll);
                  }}
                />
              </div>
            </div>
          )}

          {sortedStudents.map((student, index) => (
            <div
              key={student._id}
              className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 hover:bg-white/10 hover:shadow-lg hover:shadow-blue-950 transition-all duration-300 relative"
            >
              <span className="w-10 font-medium text-white">{index + 1}</span>
              <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                {student.profileUrl ? (
                  <img
                    src={student.profileUrl}
                    alt={student.name}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-gray-600 font-semibold">
                    {student.name?.[0] || "S"}
                  </span>
                )}
              </div>
              <div className="relative group w-[180px]">
                <span className="truncate font-medium block cursor-pointer">
                  {student.name}
                </span>

                <div
                  className="absolute left-0 -top-8 md:top-auto bottom-2 mb-2 hidden group-hover:block 
      bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50
      min-w-max"
                >
                  {student.name}
                </div>
              </div>
              <span className="w-[120px] truncate">{student.studentId}</span>
              <div className="relative group w-[120px]">
                <span className="truncate font-medium block cursor-pointer">
                  {student.department}
                </span>

                <div className="absolute left-0 bottom-2 mb-2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                  {student.department}
                </div>
              </div>{" "}
              <span className="w-[80px] truncate">{batch}</span>{" "}
              {/* Batch column */}
              <span className="w-[140px] truncate">
                {student.fastingType === "not_fasting" && "Not Fasting"}
                {student.fastingType === "fasting" && "Fasting"}
                {student.fastingType === "sunday_fasting" && "Sunday Fasting"}
                {student.fastingType === "muslim_fasting" && "Muslim Fasting"}
              </span>
              <div className="ml-auto flex items-center gap-2 relative">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleSelectStudent(student._id)}
                />
                {/* Menu button */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === student._id ? null : student._id,
                      )
                    }
                  >
                    <BsThreeDotsVertical className="h-5 w-5 text-gray-300" />
                  </button>
                  {openMenuId === student._id && (
                    <div className="menu-button absolute right-0 top-full mt-1 w-28 bg-slate-800 border border-white/10 rounded shadow z-50">
                      <button
                        className="block w-full px-3 py-2 text-sm hover:bg-gray-400 hover:text-black hover:rounded"
                        onClick={() => {
                          setStudentToEditData(student);
                          setPendingAction("edit");
                          setShowPasswordModal(true);
                          setOpenMenuId(null);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-400 hover:rounded"
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
        </div>

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>

      {/* Modals */}
      {showEditModal && studentToEditData && (
        <EditStudentModal
          student={studentToEditData}
          onCancel={() => setShowEditModal(false)}
          onSubmit={async (updated) => {
            if (!navigator.onLine) return "No internet connection";
            try {
              const res = await fetch(`${url}/campus/students/${updated.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updated),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message || "Update failed");

              setStudents((prev) =>
                prev.map((s) =>
                  s._id === data.student._id ? data.student : s,
                ),
              );
              setShowEditModal(false);
            } catch (err) {
              return err.message;
            }
          }}
        />
      )}

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
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all duration-300 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
