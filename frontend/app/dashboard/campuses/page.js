"use client";
import { useEffect, useMemo, useState } from "react"; // added useRef
import { useRouter } from "next/navigation";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoChevronBackSharp } from "react-icons/io5";
import AdminPasswordModal from "../../components/AdminPasswordModal";
import AddCampusModal from "../../components/AddCampusModal";
import EditCampusModal from "../../components/EditCampusModal";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusesPage() {
  const router = useRouter();

  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [campusToDelete, setCampusToDelete] = useState(null);
  const [campusToEdit, setCampusToEdit] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // "add" | "edit" | "delete"
  const [showEditModal, setShowEditModal] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close menu if no modal is open
      if (showAdminPasswordPrompt || showForm) return;

      // Click outside a menu button closes the menu
      if (!event.target.closest(".menu-button")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAdminPasswordPrompt, showForm]);

  // Clear admin modal error after 3 seconds
  useEffect(() => {
    if (!adminError) return; // do nothing if no error
    const timer = setTimeout(() => setAdminError(""), 2000); // 3 sec
    return () => clearTimeout(timer); // cleanup if unmounted or error changes
  }, [adminError]);

  // Fetch campuses from backend
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });
        if (!res.ok) {
          router.replace("/");
          return;
        }
        const data = await res.json();
        setCampuses(data.campuses);
      } catch {
        showToast("Failed to load campuses", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchCampuses();
  }, [router]);

  const handleAdminPasswordSubmit = async (enteredPassword) => {
    try {
      const res = await fetch(`${url}/profile/me/verify-admin-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: enteredPassword }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminError(data.message || "Wrong password");
        return;
      }

      setAdminPassword(enteredPassword);
      setShowAdminPasswordPrompt(false);
      setAdminError("");

      // Perform action based on pendingAction
      if (pendingAction === "edit" && campusToEdit) {
        // Instead of router.push, show modal
        setShowEditModal(true); // <-- new state for modal visibility
      } else if (pendingAction === "delete" && campusToDelete) {
        await handleDelete(campusToDelete);
        setCampusToDelete(null);
      } else if (pendingAction === "add") {
        setShowForm(true); // show AddCampusModal
      }

      setPendingAction(null); // reset
    } catch (err) {
      console.error(err);
      setAdminError("Something went wrong");
    }
  };

  const sortedCampuses = useMemo(
    () => [...campuses].sort((a, b) => a.name.localeCompare(b.name)),
    [campuses],
  );

  // Delete campus
  const handleDelete = async (id) => {
    const res = await fetch(`${url}/dashboard/campuses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Delete failed", "error");
      return;
    }

    setCampuses((prev) => prev.filter((c) => c._id !== id));

    showToast("Campus deleted");
  };

  if (loading) return <p className="p-6">Loading campuses...</p>;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto pt-24">
      {/* Floating Back Arrow */}
      <button
        onClick={() => router.push("/dashboard")}
        title="Back to Dashboard"
        className="fixed left-4 z-10 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg"
      >
        <IoChevronBackSharp className="w-5 h-5" />
      </button>

      {sortedCampuses.length > 0 ? (
        <div className="flex items-center gap-4 text-gray-500 text-sm font-medium px-4 py-2 mb-2">
          <span className="w-8"></span>
          <span className="w-[140px] truncate">Name</span>
          <span className="w-[120px] truncate">Location</span>
          <span className="w-[80px] text-center">Students</span>{" "}
          {/* ✅ next to Location */}
          <span className="flex-1 truncate">Email</span>
          <span className="w-6"></span>
        </div>
      ) : (
        <p className="p-6 text-center text-gray-500">No campuses found</p>
      )}

      {/* Campus rows */}
      <div className="space-y-2">
        {sortedCampuses.map((campus) => (
          <div
            key={campus._id}
            className="flex items-center gap-4 bg-white px-4 py-4 rounded text-sm relative shadow-sm"
          >
            {/* Logo from admin */}
            <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {campus.logo?.url ? (
                <img
                  src={campus.logo.url}
                  alt={campus.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">
                  {campus.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name */}
            <span className="font-medium w-[140px] truncate">
              {campus.name}
            </span>

            {/* Location */}
            <span className="text-gray-500 w-[120px] truncate">
              {campus.location || "—"}
            </span>

            {/* Students */}
            <span className="text-gray-500 w-[80px] text-center">
              {campus.students} {/* real count from backend */}
            </span>

            {/* Email */}
            <span className="text-gray-500 flex-1 truncate">
              {campus.email}
            </span>

            {/* Three-dot menu */}
            <div className="ml-auto relative">
              <button
                className="menu-button"
                onClick={() =>
                  setOpenMenuId(openMenuId === campus._id ? null : campus._id)
                }
              >
                <BsThreeDotsVertical className="h-5 w-5 text-gray-600" />
              </button>

              {openMenuId === campus._id && !showAdminPasswordPrompt && (
                <div className="menu-button absolute right-0 top-full mt-1 w-28 bg-white border rounded shadow z-10">
                  {/* Edit button triggers password modal */}
                  <button
                    className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      setCampusToEdit(campus._id);
                      setPendingAction("edit");
                      setShowAdminPasswordPrompt(true);
                      setOpenMenuId(null);
                    }}
                  >
                    Edit
                  </button>

                  {/* Delete button remains same */}
                  <button
                    className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                    onClick={() => {
                      setCampusToDelete(campus._id);
                      setPendingAction("delete");
                      setShowAdminPasswordPrompt(true);
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
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => {
            setPendingAction("add"); // remember this is for adding
            setShowAdminPasswordPrompt(true);
            setOpenMenuId(null);
          }}
          className="bg-indigo-600 text-white px-5 py-2 rounded shadow"
        >
          + Add Campus
        </button>
      </div>

      {/* Admin password modal */}
      {showAdminPasswordPrompt && (
        <AdminPasswordModal
          onCancel={() => {
            setShowAdminPasswordPrompt(false);
            setAdminError(""); // clear error when closing
          }}
          onSubmit={handleAdminPasswordSubmit}
          errorMessage={adminError} // pass error to modal
        />
      )}

      {showEditModal && campusToEdit && (
        <EditCampusModal
          campus={campuses.find((c) => c._id === campusToEdit)} // pass the full campus object
          onCancel={() => {
            setCampusToEdit(null);
            setShowEditModal(false);
          }}
          onSubmit={async (data) => {
            const res = await fetch(`${url}/dashboard/campuses/${data.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(data),
            });
            const result = await res.json();

            if (res.ok) {
              setCampuses((prev) =>
                prev.map((c) => (c._id === data.id ? result.campus : c)),
              );
              return result.message;
            } else {
              return result.message;
            }
          }}
        />
      )}

      {showForm && (
        <AddCampusModal
          onCancel={() => setShowForm(false)}
          onSubmit={async ({ name, location, email, password }) => {
            try {
              // Validation only for required fields
              if (!name.trim()) throw new Error("Name is required");
              if (!email.trim()) throw new Error("Email is required");
              if (!password.trim()) throw new Error("Password is required");
              if (password.length < 6)
                throw new Error("Password must be at least 6 characters");

              // Create campus (backend will validate email format)
              const res = await fetch(`${url}/dashboard/campuses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, location, email, password }),
              });
              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.message || "Failed to create campus");
              }

              setCampuses((prev) => [...prev, data.campus]);
              setShowForm(false); // close modal
            } catch (err) {
              return err.message; // show error in modal
            }
          }}
        />
      )}

      {/* Toast messages */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded text-white shadow ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
