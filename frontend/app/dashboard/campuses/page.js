"use client";

import { React, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BsThreeDotsVertical } from "react-icons/bs";
import AdminPasswordModal from "../../components/AdminPasswordModal";
import AddCampusModal from "../../components/AddCampusModal";
import EditCampusModal from "../../components/EditCampusModal";
import {
  getApiMessage,
  getErrorMessage,
  getFriendlyMessage,
} from "../../utils/userMessage";

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
  const [syncingCampusId, setSyncingCampusId] = useState(null);

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
        const campusList = Array.isArray(data.campuses) ? data.campuses : [];
        campusList.sort((a, b) => a.name.localeCompare(b.name));
        setCampuses(campusList);
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
        setAdminError(
          getApiMessage(data, "The password you entered is not correct."),
        );
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
    } catch (error) {
      setAdminError(
        getErrorMessage(error, "We could not verify your password right now."),
      );
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`${url}/dashboard/campuses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(
        getApiMessage(data, "We could not delete the campus right now."),
        "error",
      );
      return;
    }

    setCampuses((prev) => prev.filter((c) => c._id !== id));
    showToast("Campus deleted");
  };

  const handleSyncCampusStudents = async (id) => {
    try {
      setSyncingCampusId(id);

      const res = await fetch(`${url}/dashboard/campuses/${id}/sync-students`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(
          getApiMessage(data, "We could not fetch cafe students right now."),
          "error",
        );
        return;
      }

      setCampuses((prev) =>
        prev.map((campus) =>
          campus._id === id
            ? {
                ...campus,
                students: (campus.students ?? 0) + (data.syncedCount ?? 0),
              }
            : campus,
        ),
      );
      showToast(
        getApiMessage(data, "Cafe students fetched successfully."),
        "success",
      );
    } catch (error) {
      showToast(
        getErrorMessage(error, "We could not fetch cafe students right now."),
        "error",
      );
    } finally {
      setSyncingCampusId(null);
    }
  };

  return (
    <>
      <div className="page-shell px-4 pb-10 pt-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="surface-panel rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
                  Campus Directory
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                  Manage Campuses
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
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
                <div key={index} className="surface-card rounded-[28px] p-6">
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="mt-8 h-10 w-20 animate-pulse rounded bg-slate-200" />
                </div>
              ))
            ) : sortedCampuses.length > 0 ? (
              sortedCampuses.map((campus) => (
                <div
                  key={campus._id}
                  className="surface-card relative rounded-[28px] p-6 transition hover:-translate-y-1 hover:border-cyan-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-lg font-black text-cyan-700">
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
                        <h2 className="text-xl font-bold text-slate-900">
                          {campus.name}
                        </h2>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-600">
                          Campus ID {campus.campusId ?? "Not set"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {campus.location || "Location not set"}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        className="menu-button rounded-xl border border-slate-200 bg-white p-2 transition hover:bg-slate-50"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === campus._id ? null : campus._id,
                          )
                        }
                      >
                        <BsThreeDotsVertical className="h-5 w-5 text-slate-500" />
                      </button>

                      {openMenuId === campus._id &&
                        !showAdminPasswordPrompt && (
                          <div className="menu-button absolute right-0 top-full z-50 mt-2 w-28 rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl">
                            <button
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
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

                  <div className="mt-6 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <p className="text-sm text-slate-600">Current Students</p>
                    <p className="mt-2 text-4xl font-black text-slate-900">
                      {campus.students ?? 0}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSyncCampusStudents(campus._id)}
                      disabled={syncingCampusId === campus._id}
                      className={`mt-4 inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold text-white transition ${
                        syncingCampusId === campus._id
                          ? "cursor-not-allowed bg-slate-400"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {syncingCampusId === campus._id
                        ? "Fetching..."
                        : "Fetch Cafe Students"}
                    </button>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                      Campus Email
                    </p>
                    <p className="mt-2 break-all text-sm text-slate-600">
                      {campus.email}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600 md:col-span-2 xl:col-span-3">
                <div className="text-xl font-semibold text-slate-900">
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
                return getApiMessage(
                  result,
                  "The campus was updated successfully.",
                );
              }

              return getApiMessage(
                result,
                "We could not update the campus right now.",
              );
            }}
          />
        )}

        {showForm && (
          <AddCampusModal
            onCancel={() => setShowForm(false)}
            onSubmit={async ({ campusId, name, location, email, password }) => {
              try {
                if (!String(campusId || "").trim()) {
                  throw new Error("Please enter a campus ID.");
                }
                if (!name.trim())
                  throw new Error("Please enter a campus name.");
                if (!email.trim())
                  throw new Error("Please enter a campus email.");
                if (!password.trim())
                  throw new Error("Please enter a password.");
                if (password.length < 6) {
                  throw new Error(
                    "Password must be at least 6 characters long.",
                  );
                }

                const res = await fetch(`${url}/dashboard/campuses`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    campusId,
                    name,
                    location,
                    email,
                    password,
                  }),
                });

                const data = await res.json();
                if (!res.ok) {
                  throw new Error(
                    getApiMessage(
                      data,
                      "We could not create the campus right now.",
                    ),
                  );
                }

                setCampuses((prev) => [
                  ...prev,
                  { ...data.campus, students: data.campus.students ?? 0 },
                ]);
                setShowForm(false);
              } catch (err) {
                return getFriendlyMessage(
                  err?.message,
                  "We could not create the campus right now.",
                );
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
