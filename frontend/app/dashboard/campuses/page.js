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
      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/");
          return;
        }

        const data = await res.json();
        setCampuses(Array.isArray(data.campuses) ? data.campuses : []);
      } catch {
        showToast("Failed to load campuses", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
  }, [router]);

  const sortedCampuses = useMemo(
    () => [...campuses].sort((a, b) => a.name.localeCompare(b.name)),
    [campuses],
  );

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

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_30%),linear-gradient(180deg,_#08111f_0%,_#111827_45%,_#18263a_100%)] px-4 pb-10 pt-24 text-white md:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => router.push("/dashboard")}
            title="Back to Dashboard"
            className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg transition hover:scale-105 hover:bg-white/10"
          >
            <IoChevronBackSharp className="h-5 w-5" />
          </button>

          <div className="rounded-[30px] border border-white/10 bg-white/6 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
                  Campus Directory
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                  Manage Campuses
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                  This page shows the current registered student count for each
                  campus at the moment the admin opens it. Meal served and
                  pending numbers are removed from here.
                </p>
              </div>

              <button
                onClick={() => {
                  setPendingAction("add");
                  setShowAdminPasswordPrompt(true);
                  setOpenMenuId(null);
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01]"
              >
                + Add Campus
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl"
                >
                  <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 h-4 w-24 animate-pulse rounded bg-white/10" />
                  <div className="mt-8 h-10 w-20 animate-pulse rounded bg-white/10" />
                </div>
              ))
            ) : sortedCampuses.length > 0 ? (
              sortedCampuses.map((campus) => (
                <div
                  key={campus._id}
                  className="relative rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,_rgba(15,23,42,0.86),_rgba(30,41,59,0.7))] p-6 shadow-2xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-400/15 text-lg font-black text-cyan-200">
                        {campus.logo?.url ? (
                          <img
                            src={campus.logo.url}
                            alt={campus.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          campus.name?.[0]
                        )}
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {campus.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-300">
                          {campus.location || "Location not set"}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        className="menu-button rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === campus._id ? null : campus._id,
                          )
                        }
                      >
                        <BsThreeDotsVertical className="h-5 w-5 text-gray-300" />
                      </button>

                      {openMenuId === campus._id && !showAdminPasswordPrompt && (
                        <div className="menu-button absolute right-0 top-full z-50 mt-2 w-28 rounded-2xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl">
                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
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
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
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

                  <div className="mt-6 rounded-3xl bg-white/6 p-5 ring-1 ring-white/10">
                    <p className="text-sm text-slate-300">Current Students</p>
                    <p className="mt-2 text-4xl font-black text-white">
                      {campus.students ?? 0}
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Campus Email
                    </p>
                    <p className="mt-2 break-all text-sm text-slate-300">
                      {campus.email}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-8 text-center text-slate-300 md:col-span-2 xl:col-span-3">
                <div className="text-xl font-semibold text-white">
                  No campuses yet
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Add your first campus to start managing students and meals.
                </div>
              </div>
            )}
          </div>
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
                  prev.map((c) =>
                    c._id === data.id
                      ? { ...c, ...result.campus, students: c.students ?? 0 }
                      : c,
                  ),
                );
                return result.message;
              }

              return result.message || "Failed to update campus";
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
                if (password.length < 6) {
                  throw new Error("Password must be at least 6 characters");
                }

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

                setCampuses((prev) => [
                  ...prev,
                  { ...data.campus, students: data.campus.students ?? 0 },
                ]);
                setShowForm(false);
              } catch (err) {
                return err.message;
              }
            }}
          />
        )}

        {toast && (
          <div
            className={`fixed bottom-6 right-6 rounded-2xl px-4 py-3 text-white shadow-2xl ${
              toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}
