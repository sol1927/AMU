"use client";

import { useEffect, useState, useMemo } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import CampusNavbar from "@/app/components/CampusNavbar";
import AddStudentModal from "@/app/components/AddStudentModal";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import EditStudentModal from "@/app/components/EditStudentModal";

export default function CampusStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "edit" | "delete"
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [campusPassword, setCampusPassword] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToEditData, setStudentToEditData] = useState(null);

  /* ---------------- Fetch students ---------------- */
  const fetchStudents = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/campus/students?search=${query}`,
        { credentials: "include" },
      );
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
      const fetchData = async () => {
        await fetchStudents(searchQuery);
      };
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  /* ---------------- Handle password verification ---------------- */
  const handlePasswordSubmit = async (enteredPassword) => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/campus/verify-campus-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password: enteredPassword }),
        },
      );

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
      }

      setPendingAction(null);
    } catch (err) {
      setPasswordError("Something went wrong");
    }
  };

  /* ---------------- Actions ---------------- */
  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/campus/students/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      setStudents((prev) => prev.filter((s) => s._id !== id));

      // Update campus students count
      setCampuses((prev) =>
        prev.map((c) =>
          c._id === data.student.campus
            ? { ...c, students: (c.students || 1) - 1 }
            : c,
        ),
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students],
  );

  return (
    <>
      <CampusNavbar />

      <div className="pt-24 h-screen max-w-5xl mx-auto px-6 flex flex-col">
        {/* Header */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Students</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add Student
            </button>
          </div>

          {/* Search */}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full p-2 mb-4 border rounded"
          />

          {loading && <p className="text-center mt-12">Loading students...</p>}

          {/* Column Header */}
          {!loading && sortedStudents.length > 0 && (
            <div className="flex items-center gap-4 text-gray-500 text-sm font-medium px-4 py-2 mb-2 bg-gray-100 rounded">
              <span className="w-10">#</span>
              <span className="w-[180px]">Name</span>
              <span className="w-[120px]">Student ID</span>
              <span className="w-[120px]">Department</span>
              <span className="w-[80px]">Batch</span>
              <span className="w-6"></span>
            </div>
          )}
        </div>

        {/* Students list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 relative">
          {sortedStudents.map((student, index) => (
            <div
              key={student._id}
              className="flex items-center gap-4 bg-white px-4 py-3 rounded shadow-sm text-sm relative"
            >
              <span className="w-10 font-medium">{index + 1}</span>

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

              <span className="w-[180px] truncate font-medium">
                {student.name}
              </span>
              <span className="w-[120px] truncate">{student.studentId}</span>
              <span className="w-[120px] truncate">{student.department}</span>
              <span className="w-[80px] truncate">{student.batch}</span>

              {/* Menu */}
              <div className="ml-auto relative">
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
                        setStudentToEditData(studentData); // Save student for edit modal
                        setPendingAction("edit"); // Mark pending action as edit
                        setShowPasswordModal(true); // Open campus password modal first
                        setOpenMenuId(null); // Close dropdown
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
          ))}

          {!loading && sortedStudents.length === 0 && (
            <p className="text-center text-gray-500 mt-12">Student not found</p>
          )}
        </div>

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onCancel={() => setShowAddModal(false)}
          onSubmit={async ({ name, studentId, department, batch, photo }) => {
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
              formData.append("photo", photo);

              const res = await fetch(
                "http://localhost:5000/api/campus/students",
                {
                  method: "POST",
                  credentials: "include",
                  body: formData,
                },
              );

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
          }) => {
            try {
              // 1️⃣ Update text fields (JSON)
              const resText = await fetch(
                `http://localhost:5000/api/campus/students/${id}`,
                {
                  method: "PUT",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, studentId, department, batch }),
                },
              );
              const dataText = await resText.json();
              if (!resText.ok)
                throw new Error(dataText.message || "Update failed");

              // 2️⃣ Update photo if exists
              let updatedStudent = dataText.student;
              if (photo) {
                const formData = new FormData();
                formData.append("photo", photo);

                const resPhoto = await fetch(
                  `http://localhost:5000/api/campus/students/${id}/photo`,
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
