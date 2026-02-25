"use client";
import { React, useEffect, useMemo, useState } from "react";
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
  const [adminError, setAdminError] = useState("");
  const [campusToDelete, setCampusToDelete] = useState(null);
  const [campusToEdit, setCampusToEdit] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminPasswordPrompt || showForm) return;

      if (!event.target.closest(".menu-button")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAdminPasswordPrompt, showForm]);

  useEffect(() => {
    if (!adminError) return;
    const timer = setTimeout(() => setAdminError(""), 2000);
    return () => clearTimeout(timer);
  }, [adminError]);

  useEffect(() => {
    const fetchCampuses = async () => {
      if (!navigator.onLine) {
        showToast("No internet connection", "error");
        setLoading(false);
        return;
      }

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
      setShowAdminPasswordPrompt(false);
      setAdminError("");

      if (pendingAction === "edit" && campusToEdit) {
        setShowEditModal(true);
      } else if (pendingAction === "delete" && campusToDelete) {
        await handleDelete(campusToDelete);
        setCampusToDelete(null);
      } else if (pendingAction === "add") {
        setShowForm(true);
      }

      setPendingAction(null);
    } catch {
      setAdminError("Something went wrong");
    }
  };

  const sortedCampuses = useMemo(
    () => [...campuses].sort((a, b) => a.name.localeCompare(b.name)),
    [campuses],
  );

  const handleDelete = async (id) => {
    if (!navigator.onLine) {
      showToast("No internet connection", "error");
      return;
    }

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
  const capitalizeWords = (str) =>
    str
      ? str
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ")
      : "";

  return (
    <>
      <div className="pt-24 h-screen text-white max-w-7xl mx-auto px-4 sm:px-6 md:px-6 flex flex-col">
        {" "}
        <button
          onClick={() => router.push("/dashboard")}
          title="Back to Dashboard"
          className="fixed top-24 left-6 z-20 bg-gray-900/80 hover:bg-gray-800 hover:cursor-pointer text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <IoChevronBackSharp className="w-5 h-5" />
        </button>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Campuses</h1>
          <button
            onClick={() => {
              setPendingAction("add");
              setShowAdminPasswordPrompt(true);
              setOpenMenuId(null);
            }}
            className="bg-indigo-600  hover:cursor-pointer text-white px-5 py-2 rounded-2xl hover:bg-indigo-900 transition"
          >
            + Add Campus
          </button>
        </div>
        {sortedCampuses.length > 0 && (
          <div className="flex items-center gap-4 text-gray-400 text-sm font-medium px-4 py-3 mb-2 bg-white/5 rounded border border-white/10">
            <div className="w-10"></div>
            <div className="w-[180px]">Name</div>
            <div className="w-[150px]">Location</div>
            <div className="w-[100px] text-center">Students</div>
            <div className="flex-1">Email</div>
            <div className="w-10"></div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {sortedCampuses.length > 0 ? (
            sortedCampuses.map((campus) => (
              <div
                key={campus._id}
                className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-4 hover:bg-white/10 hover:shadow-lg hover:shadow-blue-950 transition-all duration-300 relative"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {campus.logo?.url ? (
                    <img
                      src={campus.logo.url}
                      alt={campus.name}
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-gray-600 font-semibold">
                      {campus.name?.[0]}
                    </span>
                  )}
                </div>
                <div className="relative group w-[180px]">
                  <span className="truncate font-medium block cursor-pointer">
                    {capitalizeWords(campus.name)}
                  </span>

                  <div
                    className="absolute left-0 -top-8 md:top-auto bottom-2 mb-2 hidden group-hover:block 
      bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50
      min-w-max"
                  >
                    {capitalizeWords(campus.name)}
                  </div>
                </div>
                <div className="relative group w-[150px]">
                  <span className="truncate text-gray-400 block cursor-pointer">
                    {campus.location || "—"}
                  </span>

                  {campus.location && (
                    <div
                      className="absolute left-0 -top-8 md:top-auto bottom-2 mb-2 hidden group-hover:block 
        bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50
        min-w-max"
                    >
                      {campus.location}
                    </div>
                  )}
                </div>
                <div className="w-[100px] text-center text-gray-400">
                  {campus.students ?? 0}
                </div>

                <div className="flex-1 truncate text-gray-400">
                  {campus.email}
                </div>
                <div className="w-10 flex justify-end relative">
                  <button
                    className="menu-button hover:bg-white/10 p-1 rounded"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === campus._id ? null : campus._id,
                      )
                    }
                  >
                    <BsThreeDotsVertical className="h-5 w-5  hover:cursor-pointer text-gray-300" />
                  </button>

                  {openMenuId === campus._id && !showAdminPasswordPrompt && (
                    <div className="menu-button absolute right-0 top-full mt-1 w-28 bg-slate-800 border border-white/10 rounded shadow z-50">
                      <button
                        className="block  hover:cursor-pointer w-full px-3 py-2 text-sm hover:bg-gray-400 hover:text-black hover:rounded"
                        onClick={() => {
                          setCampusToEdit(campus._id);
                          setPendingAction("edit");
                          setShowAdminPasswordPrompt(true);
                          setOpenMenuId(null);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="block  hover:cursor-pointer w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-400 hover:rounded"
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
            ))
          ) : (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
              <div className="text-xl font-semibold mb-2">No campuses yet</div>
              <div className="text-sm text-gray-600">
                Click “Add Campus” to create your first campus.
              </div>
            </div>
          )}
        </div>
        {showAdminPasswordPrompt && (
          <AdminPasswordModal
            onCancel={() => {
              setShowAdminPasswordPrompt(false);
              setAdminError("");
            }}
            onSubmit={handleAdminPasswordSubmit}
            errorMessage={adminError}
          />
        )}
        {showEditModal && campusToEdit && (
          <EditCampusModal
            campus={campuses.find((c) => c._id === campusToEdit)}
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
                if (!name.trim()) throw new Error("Name is required");
                if (!email.trim()) throw new Error("Email is required");
                if (!password.trim()) throw new Error("Password is required");
                if (password.length < 6)
                  throw new Error("Password must be at least 6 characters");

                const res = await fetch(`${url}/dashboard/campuses`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ name, location, email, password }),
                });

                const data = await res.json();
                if (!res.ok)
                  throw new Error(data.message || "Failed to create campus");

                setCampuses((prev) => [...prev, data.campus]);
                setShowForm(false);
              } catch (err) {
                return err.message;
              }
            }}
          />
        )}
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
    </>
  );
}
