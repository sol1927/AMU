"use client";

import { useEffect, useState, useMemo } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import CampusNavbar from "@/app/components/CampusNavbar";
import ConfirmCampusPasswordModal from "@/app/components/CampusPasswordModal";
import EditStudentModal from "@/app/components/EditStudentModal";
import { useCampus } from "@/app/context/CampusContext";
import { usePathname, useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function BatchStudentsPage() {
  const pathname = usePathname();
  const batch = pathname.split("/").pop(); // get batch from URL
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fastingFilter, setFastingFilter] = useState(""); // default all fasting types
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "edit" | "delete"
  const [studentToEditData, setStudentToEditData] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const { currentCampus, refreshCampus } = useCampus();

  /* ---------------- Fetch students ---------------- */
  const fetchStudentsByBatch = async (batch, query = "", fasting = "") => {
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
    }
  };

  useEffect(() => {
    fetchStudentsByBatch(batch, searchQuery, fastingFilter);
  }, [batch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudentsByBatch(batch, searchQuery, fastingFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fastingFilter]);

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

      setShowPasswordModal(false);
      setPasswordError("");

      if (pendingAction === "delete" && studentToDelete) {
        await handleDelete(studentToDelete);
        setStudentToDelete(null);
      } else if (pendingAction === "edit" && studentToEditData) {
        setShowEditModal(true);
      }
      if (pendingAction === "bulkDelete") {
        try {
          const res = await fetch(`${url}/campus/students/bulk-delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ids: selectedStudents }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message);

          setStudents((prev) =>
            prev.filter((s) => !selectedStudents.includes(s._id)),
          );

          setSelectedStudents([]);
          await refreshCampus();
        } catch (err) {
          alert(err.message);
        }
      }

      setPendingAction(null);
    } catch (err) {
      setPasswordError("Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${url}/campus/students/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      setStudents((prev) => prev.filter((s) => s._id !== id));
      await refreshCampus();
    } catch (err) {
      alert(err.message);
    }
  };

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [students],
  );

  if (!currentCampus)
    return <p className="p-6 text-center mt-24">Loading...</p>;

  return (
    <>
      <CampusNavbar />
      <div className="pt-24 h-screen max-w-5xl mx-auto px-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Batch {batch}</h1>
          <button
            onClick={() => router.push("/campus/students/groups")}
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          >
            Back
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

        {/* Students list */}
        {loading && <p className="text-center mt-12">Loading...</p>}
        {!loading && sortedStudents.length === 0 && (
          <p className="text-center mt-12">No students in this batch</p>
        )}
        {!loading && sortedStudents.length > 0 && (
          <>
            {/* Header above table: total students left, delete button right */}
            <div className="flex justify-between items-center mb-3 px-4">
              <p className="text-gray-700 font-medium">
                {sortedStudents.length}{" "}
                {sortedStudents.length === 1 ? "student" : "students"}
              </p>

              {selectedStudents.length > 0 && (
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  onClick={() => {
                    setPendingAction("bulkDelete");
                    setShowPasswordModal(true);
                  }}
                >
                  Delete Selected ({selectedStudents.length})
                </button>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {/* Table header */}
              <div className="flex items-center gap-4 text-gray-500 text-sm font-medium px-4 py-2 mb-2 bg-gray-100 rounded">
                <span className="w-10">#</span> {/* Row number */}
                <span className="w-[180px]">Name</span>
                <span className="w-[120px]">Student ID</span>
                <span className="w-[120px]">Department</span>
                <span className="w-[140px]">Fasting</span>
                <span className="w-6"></span>{" "}
                {/* Placeholder for three-dot menu */}
                {/* Select All checkbox at the right */}
                <input
                  type="checkbox"
                  className="w-5 h-5 ml-auto"
                  checked={
                    selectedStudents.length === sortedStudents.length &&
                    sortedStudents.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents(sortedStudents.map((s) => s._id));
                    } else {
                      setSelectedStudents([]);
                    }
                  }}
                />
              </div>

              {sortedStudents.map((student, index) => (
                <div
                  key={student._id}
                  className="flex items-center gap-4 bg-white px-4 py-3 rounded shadow-sm text-sm relative"
                >
                  {/* Row number */}
                  <span className="w-10 font-medium">{index + 1}</span>

                  {/* Profile */}
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

                  {/* Student info */}
                  <span className="w-[180px] truncate font-medium">
                    {student.name}
                  </span>
                  <span className="w-[120px] truncate">
                    {student.studentId}
                  </span>
                  <span className="w-[120px] truncate">
                    {student.department}
                  </span>
                  <span className="w-[140px] truncate">
                    {student.fastingType === "not_fasting" && "Not Fasting"}
                    {student.fastingType === "fasting" && "Fasting"}
                    {student.fastingType === "sunday_fasting" &&
                      "Sunday Fasting"}
                  </span>

                  {/* Checkbox + Three dots menu */}
                  <div className="ml-auto flex items-center gap-2 relative">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents((prev) => [...prev, student._id]);
                        } else {
                          setSelectedStudents((prev) =>
                            prev.filter((id) => id !== student._id),
                          );
                        }
                      }}
                    />
                    <div className="menu-button">
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
                              setStudentToEditData(student);
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
            </div>
          </>
        )}
      </div>
      {/* Modals */}
      {showEditModal && studentToEditData && (
        <EditStudentModal
          student={studentToEditData}
          onCancel={() => setShowEditModal(false)}
          onSubmit={async (updated) => {
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
    </>
  );
}
