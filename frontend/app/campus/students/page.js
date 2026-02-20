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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    } catch (err) {
      alert("Bulk delete failed");
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

      // 🔄 Refresh campus data so counts update
      await refreshCampus();
    } catch (err) {
      alert(err.message);
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

  if (setStudentsLoading)
    return <p className="p-6 text-center mt-24">Loading...</p>;
  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />

      <div className="pt-24 h-screen max-w-5xl mx-auto px-6 flex flex-col">
        <button
          onClick={() => router.push("/campus/students/groups")}
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        >
          Group
        </button>

        {/* Header */}
        <div>
          {/* Replace the bulk action header and search section with this layout */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Students</h1>
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
              className="flex-1 p-2 border rounded"
            />
            <select
              value={fastingFilter}
              onChange={(e) => setFastingFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">All Fasting Types</option>
              <option value="fasting">Fasting</option>
              <option value="not_fasting">Not Fasting</option>
              <option value="sunday_fasting">Sunday Fasting</option>
            </select>
          </div>

          {/* Header above table */}
          <div className="flex justify-between items-center mb-3 px-4">
            {/* Total students */}
            <p className="text-gray-700 font-medium">
              {filteredAndSortedStudents.length}{" "}
              {filteredAndSortedStudents.length === 1 ? "student" : "students"}
            </p>

            {/* Bulk delete button */}
            {selectedStudents.length > 0 && (
              <button
                onClick={() => {
                  setPendingAction("bulk_delete");
                  setShowPasswordModal(true);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete Selected ({selectedStudents.length})
              </button>
            )}
          </div>

          {loading && <p className="text-center mt-12">Loading students...</p>}

          {/* Column Header */}
          {/* Column Header */}
          {!loading && filteredAndSortedStudents.length > 0 && (
            <div className="flex items-center gap-4 text-gray-500 text-sm font-medium px-4 py-2 mb-2 bg-gray-100 rounded">
              <span className="w-10">#</span>
              <span className="w-[180px]">Name</span>
              <span className="w-[120px]">Student ID</span>
              <span className="w-[120px]">Department</span>
              <span className="w-[80px]">Batch</span>
              <span className="w-[140px]">Fasting</span>

              {/* Select All checkbox at the right */}
              <div className="ml-auto w-10 flex justify-end">
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
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 relative">
          {filteredAndSortedStudents.map((student, index) => (
            <div
              key={student._id}
              className="flex items-center gap-4 bg-white px-4 py-3 rounded shadow-sm text-sm relative"
            >
              {/* Avatar and info on the left */}
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
              </span>

              {/* Checkboxes and menu on the right */}
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleSelectStudent(student._id)}
                />

                <div className="relative menu-button">
                  <button
                    className="menu-button"
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

          {!loading && filteredAndSortedStudents.length === 0 && (
            <p className="text-center text-gray-500 mt-12">Student not found</p>
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
    </>
  );
}
