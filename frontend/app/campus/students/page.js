"use client";

import { useEffect, useState, useMemo } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import CampusNavbar from "@/app/components/CampusNavbar";
import AddStudentModal from "@/app/components/AddStudentModal";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import EditStudentModal from "@/app/components/EditStudentModal";
import { useCampus } from "@/app/context/CampusContext";
import { useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const router = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "edit" | "delete"
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [campusPassword, setCampusPassword] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToEditData, setStudentToEditData] = useState(null);
  const { currentCampus, refreshCampus, setStudentsLoading } = useCampus();
  const [fastingFilter, setFastingFilter] = useState(""); // "" | "fasting" | "not_fasting" | "sunday_fasting"
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkFastingType, setBulkFastingType] = useState("");
  const [savingBulkFasting, setSavingBulkFasting] = useState(false);
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0); // new

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  /* ---------------- Fetch students ---------------- */
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
      if (!res.ok) throw new Error(data.message);
      setStudents(data.students || []);
      setTotalStudents(data.totalStudents || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoadDone(true); // mark that first fetch finished
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchStudents();
    };
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery, fastingFilter);

      // Clear selection when filter/search changes
      setSelectedStudents([]);
      setSelectAll(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fastingFilter]);

  /* ---------------- Outside click for menu ---------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-button")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (selectedStudents.length === 0) {
      setBulkFastingType(""); // reset dropdown
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
    } else {
      setSelectedStudents(filteredAndSortedStudents.map((s) => s._id));
    }
    setSelectAll(!selectAll);
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
        prev.filter((s) => !selectedStudents.includes(s._id)),
      );

      setSelectedStudents([]);
      setSelectAll(false);

      await refreshCampus();

      // ✅ SUCCESS TOAST HERE
      showToast("Selected students deleted successfully", "success");
    } catch (err) {
      showToast("Bulk delete failed", "error");
    }
  };

  /* ---------------- Handle password verification ---------------- */
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
        setPasswordError(data.message || "Wrong password");
        return;
      }

      setCampusPassword(enteredPassword);
      setShowPasswordModal(false);
      setPasswordError("");

      // Perform pending action
      if (pendingAction === "delete" && studentToDelete) {
        await handleDelete(studentToDelete);
        setStudentToDelete(null);
      } else if (pendingAction === "edit" && studentToEditData) {
        setShowEditModal(true); // Open edit modal after password is verified
      } else if (pendingAction === "bulk_delete") {
        await handleBulkDelete();
      }
      setPendingAction(null);
    } catch (err) {
      setPasswordError("Something went wrong");
    }
  };

  /* ---------------- Actions ---------------- */
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${url}/campus/students/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      setStudents((prev) => prev.filter((s) => s._id !== id));
      showToast("Student deleted successfully", "success");

      // 🔄 Refresh campus data so counts update
      await refreshCampus();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const filteredAndSortedStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return students
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.studentId?.toLowerCase().includes(q) ||
          s.department?.toLowerCase().includes(q) ||
          s.batch?.toString().toLowerCase().includes(q),
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [students, searchQuery]);
  useEffect(() => {
    if (
      filteredAndSortedStudents.length > 0 &&
      selectedStudents.length === filteredAndSortedStudents.length
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedStudents, filteredAndSortedStudents]);

  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />

      <div className="pt-24 h-screen max-w-5xl mx-auto px-6 flex flex-col">
        {/* Header */}
        <div>
          {/* Replace the bulk action header and search section with this layout */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Students</h1>
            <button
              onClick={() => router.push("/campus/students/groups")}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Batch
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add Student
            </button>
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
            {/* Total students */}
            <p className="text-gray-300 font-medium">
              {totalStudents} {totalStudents === 1 ? "student" : "students"}
            </p>

            {/* Bulk delete button */}
            {selectedStudents.length > 0 && (
              <div className="flex items-center gap-2">
                {/* Delete button */}
                <button
                  onClick={() => {
                    setPendingAction("bulk_delete");
                    setShowPasswordModal(true);
                  }}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Delete ({selectedStudents.length})
                </button>

                {/* Fasting dropdown */}
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
                  <option
                    className="bg-gray-900 text-white"
                    value="not_fasting"
                  >
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
                {/* Save button */}
                {bulkFastingType && (
                  <button
                    disabled={savingBulkFasting}
                    onClick={async () => {
                      try {
                        setSavingBulkFasting(true);

                        const res = await fetch(
                          `${url}/campus/students/bulk-fasting`,
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
                        if (!res.ok) throw new Error(data.message);

                        // Update state
                        setStudents((prev) =>
                          prev.map((s) =>
                            selectedStudents.includes(s._id)
                              ? { ...s, fastingType: bulkFastingType }
                              : s,
                          ),
                        );

                        // Reset
                        setSelectedStudents([]);
                        setSelectAll(false);
                        setBulkFastingType("");
                        showToast(
                          "Fasting status updated successfully",
                          "success",
                        );
                      } catch (err) {
                        showToast(err.message || "Update failed", "error");
                      } finally {
                        setSavingBulkFasting(false);
                      }
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingBulkFasting ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            )}
          </div>

          {loading && <p className="text-center mt-12">Loading students...</p>}

          {/* Column Header */}
          {!loading && filteredAndSortedStudents.length > 0 && (
            <div className="flex items-center gap-4 text-gray-300 text-sm font-medium px-4 py-2 mb-2 bg-white/10 border border-white/10 backdrop-blur-md rounded-xl">
              <span className="w-10">#</span>
              <span className="w-9"></span> {/* Space for avatar */}
              <span className="w-[180px]">Name</span>
              <span className="w-[120px]">Student ID</span>
              <span className="w-[120px]">Department</span>
              <span className="w-[80px]">Batch</span>
              <span className="w-[140px]">Fasting</span>
              <div className="w-20 flex justify-between items-center">
                {" "}
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </div>
            </div>
          )}
        </div>

        {/* Students list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4 relative">
          {filteredAndSortedStudents.map((student, index) => (
            <div
              key={student._id}
              className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-3 rounded-xl shadow-lg hover:bg-white/10 transition text-sm relative backdrop-blur-md"
            >
              {/* Avatar and info on the left */}
              {/* Serial Number */}
              <span className="w-10 font-medium text-white">{index + 1}</span>

              {/* Avatar */}
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

              {/* Name */}
              <span className="w-[180px] truncate font-medium">
                {student.name}
              </span>
              <span className="w-[120px] truncate">{student.studentId}</span>
              <span className="w-[120px] truncate">{student.department}</span>
              <span className="w-[80px] truncate">{student.batch}</span>
              <span className="w-[140px] truncate">
                {student.fastingType === "not_fasting" && "Not Fasting"}
                {student.fastingType === "fasting" && "Fasting"}
                {student.fastingType === "sunday_fasting" && "Sunday Fasting"}
                {student.fastingType === "muslim_fasting" && "Muslim Fasting"}
              </span>

              {/* Checkboxes and menu on the right */}
              <div className="w-20 flex justify-between items-center">
                {" "}
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleSelectStudent(student._id)}
                />
                <div className="relative menu-button">
                  <button
                    className="menu-button hover:bg-white/10 p-1 rounded"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === student._id ? null : student._id,
                      )
                    }
                  >
                    <BsThreeDotsVertical className="h-5 w-5 text-gray-600" />
                  </button>

                  {openMenuId === student._id && (
                    <div className="absolute right-0 top-full mt-1 w-28 bg-white border rounded shadow z-50">
                      <button
                        className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => {
                          const studentData = students.find(
                            (s) => s._id === student._id,
                          );
                          setStudentToEditData(studentData);
                          setPendingAction("edit");
                          setShowPasswordModal(true);
                          setOpenMenuId(null);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
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

          {!loading &&
            initialLoadDone &&
            filteredAndSortedStudents.length === 0 && (
              <p className="text-center text-gray-500 mt-12">
                Student not found
              </p>
            )}
        </div>

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onCancel={() => setShowAddModal(false)}
          onSubmit={async ({
            name,
            studentId,
            department,
            batch,
            fastingType,
            photo,
          }) => {
            try {
              if (!name.trim()) throw new Error("Name is required");
              if (!studentId.trim()) throw new Error("Student ID is required");
              if (!department.trim()) throw new Error("Department is required");
              if (!batch.trim()) throw new Error("Batch is required");
              if (!photo) throw new Error("Photo is required");

              const formData = new FormData();
              formData.append("name", name);
              formData.append("studentId", studentId);
              formData.append("department", department);
              formData.append("batch", batch);
              formData.append("fastingType", fastingType); // ✅ ADD THIS
              formData.append("photo", photo);

              const res = await fetch(`${url}/campus/students`, {
                method: "POST",
                credentials: "include",
                body: formData,
              });

              const data = await res.json();
              if (!res.ok)
                throw new Error(data.message || "Failed to add student");

              setStudents((prev) => [...prev, data.student]);
              setShowAddModal(false);

              // Update campus students count
              setCampuses((prev) =>
                prev.map((c) =>
                  c._id === data.student.campus
                    ? { ...c, students: (c.students || 0) + 1 }
                    : c,
                ),
              );
            } catch (err) {
              return err.message;
            }
          }}
        />
      )}

      {showEditModal && studentToEditData && (
        <EditStudentModal
          student={studentToEditData} // Pass the student object
          onCancel={() => setShowEditModal(false)}
          onSubmit={async ({
            id,
            name,
            studentId,
            department,
            batch,
            photo,
            fastingType,
          }) => {
            try {
              // 1️⃣ Update text fields (JSON)
              const resText = await fetch(`${url}/campus/students/${id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  studentId,
                  department,
                  batch,
                  fastingType,
                }),
              });
              const dataText = await resText.json();
              if (!resText.ok)
                throw new Error(dataText.message || "Update failed");

              // 2️⃣ Update photo if exists
              let updatedStudent = dataText.student;
              if (photo) {
                const formData = new FormData();
                formData.append("photo", photo);
                const resPhoto = await fetch(
                  `${url}/campus/students/${id}/photo`,
                  {
                    method: "PUT",
                    credentials: "include",
                    body: formData,
                  },
                );
                const dataPhoto = await resPhoto.json();
                if (!resPhoto.ok)
                  throw new Error(dataPhoto.message || "Photo update failed");

                // update student object with new photo URL
                updatedStudent = {
                  ...updatedStudent,
                  profileUrl: dataPhoto.profileUrl,
                };
              }

              // 3️⃣ Update state
              setStudents((prev) =>
                prev.map((s) =>
                  s._id === updatedStudent._id ? updatedStudent : s,
                ),
              );
              setShowEditModal(false);
            } catch (err) {
              return err.message;
            }
          }}
        />
      )}

      {/* Campus password modal */}
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
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all duration-300
      ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}
    `}
        >
          students
          {toast.message}
        </div>
      )}
    </>
  );
}
