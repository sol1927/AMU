"use client";

import { useEffect, useState } from "react";
import CampusNavbar from "../../components/CampusNavbar";
import { BsArrowClockwise, BsThreeDotsVertical } from "react-icons/bs";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function CafesPage() {
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCampusPassword, setShowCampusPassword] = useState(false);
  const [showDeleteCampusPassword, setShowDeleteCampusPassword] =
    useState(false);
  const [deleteCampusPassword, setDeleteCampusPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    campusPassword: "",
  });

  // Edit and Delete state
  const [cafeToEdit, setCafeToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    displayName: "",
    password: "",
    campusPassword: "",
  });
  const [cafeToDelete, setCafeToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCafes = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const res = await fetch("/api/campus/cafes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch cafes");
      setCafes(data.cafes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCafes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".menu-button")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (cafeToEdit) {
      setEditForm({
        username: cafeToEdit.name || "",
        displayName: cafeToEdit.displayName || "",
        password: "",
        campusPassword: "",
      });
      setError("");
      setShowPassword(false);
      setShowCampusPassword(false);
    }
  }, [cafeToEdit]);

  const handleAddCafe = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Trim and double check space validation
    const username = form.username.trim().toLowerCase();
    if (/\s/.test(username)) {
      setError("Username cannot contain spaces.");
      setSaving(false);
      return;
    }

    try {
      if (!form.campusPassword) {
        throw new Error("Campus password is required to add a cafe.");
      }
      const res = await fetch("/api/campus/cafes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username,
          username: username,
          displayName: form.displayName,
          password: form.password,
          campusPassword: form.campusPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add cafe");
      setForm({
        username: "",
        displayName: "",
        password: "",
        campusPassword: "",
      });
      setShowAddModal(false);
      showToast("Cafe operator registered successfully", "success");
      fetchCafes({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCafe = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const username = editForm.username.trim().toLowerCase();
    if (/\s/.test(username)) {
      setError("Username cannot contain spaces.");
      setSaving(false);
      return;
    }

    try {
      if (!editForm.campusPassword) {
        throw new Error("Campus password is required to update a cafe.");
      }
      const payload = {
        name: username,
        username: username,
        displayName: editForm.displayName,
        campusPassword: editForm.campusPassword,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      const res = await fetch(
        `/api/campus/cafes?id=${cafeToEdit.id || cafeToEdit._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update cafe");
      setCafeToEdit(null);
      showToast("Cafe operator updated successfully", "success");
      fetchCafes({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCafe = async () => {
    setSaving(true);
    setError("");
    try {
      if (!deleteCampusPassword) {
        throw new Error("Campus password is required to delete a cafe.");
      }
      const res = await fetch(
        `/api/campus/cafes?id=${cafeToDelete.id || cafeToDelete._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campusPassword: deleteCampusPassword }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete cafe");
      setCafeToDelete(null);
      setDeleteCampusPassword("");
      setShowDeleteCampusPassword(false);
      showToast("Cafe operator deleted successfully", "success");
      fetchCafes({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getCafeName = (name) => {
    if (!name) return "Cafe";
    if (/^cafe/i.test(name)) {
      return name.replace(/^cafe/i, "Cafe ").trim();
    }
    const formatted = name.charAt(0).toUpperCase() + name.slice(1);
    return formatted.replace(/([^-\s])(\d+)/g, "$1 $2").trim();
  };

  return (
    <>
      <CampusNavbar />
      <div className="page-shell px-4 pb-10 pt-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="surface-panel rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
                  Cafe Directory
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                  Manage Cafes
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-400 md:text-base">
                  This page displays the registered cafe operator accounts for
                  your campus. Cafe operators log in to scan student ID cards
                  during meal session windows.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fetchCafes({ silent: true })}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BsArrowClockwise
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  onClick={() => {
                    setError("");
                    setShowPassword(false);
                    setShowCampusPassword(false);
                    setForm({ ...form, campusPassword: "" });
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01]"
                >
                  + Add Cafe
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="surface-card rounded-[28px] p-6 animate-pulse"
                >
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="mt-6 h-20 rounded-3xl bg-slate-200 dark:bg-slate-800" />
                </div>
              ))
            ) : cafes.length > 0 ? (
              cafes.map((cafe) => (
                <div
                  key={cafe.id || cafe._id}
                  className="surface-card relative rounded-[28px] p-6 transition hover:-translate-y-1 hover:border-cyan-300 dark:hover:border-cyan-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-lg font-black text-cyan-700 dark:text-cyan-400">
                        {cafe.logo?.url ? (
                          <img
                            src={cafe.logo.url}
                            alt={cafe.displayName || cafe.name || "Cafe logo"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (cafe.displayName || cafe.name || "?").charAt(0)
                        )}
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          Name
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p
                            title={cafe.displayName || getCafeName(cafe.name)}
                            className="text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
                          >
                            {cafe.displayName || getCafeName(cafe.name)}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {cafe.studentCount ?? 0} students
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        className="menu-button rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === (cafe.id || cafe._id)
                              ? null
                              : cafe.id || cafe._id,
                          )
                        }
                      >
                        <BsThreeDotsVertical className="h-5 w-5 text-slate-500" />
                      </button>

                      {openMenuId === (cafe.id || cafe._id) && (
                        <div className="menu-button absolute right-0 top-full z-50 mt-2 w-28 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-2xl">
                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => {
                              setCafeToEdit(cafe);
                              setOpenMenuId(null);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 transition hover:bg-red-500/10"
                            onClick={() => {
                              setCafeToDelete(cafe);
                              setError("");
                              setDeleteCampusPassword("");
                              setShowDeleteCampusPassword(false);
                              setOpenMenuId(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Small Box showing status */}
                  <div className="mt-6 rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 ring-1 ring-slate-200 dark:ring-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                      Operator Status
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full ${
                          cafe.isOnline
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      />
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {cafe.isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                    {cafe.lastActiveAt && (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Active:{" "}
                        {new Date(cafe.lastActiveAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">
                      Username
                    </p>
                    <p
                      title={cafe.name}
                      className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-[150px] truncate"
                    >
                      {cafe.name}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-950/50 p-8 text-center text-slate-600 dark:text-slate-400 md:col-span-2 xl:col-span-3">
                <div className="text-xl font-semibold text-slate-900 dark:text-white">
                  No cafes registered
                </div>
                <div className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                  Add your first cafe to start assigning operators.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Cafe Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          >
            <form
              onSubmit={handleAddCafe}
              autoComplete="off"
              className="surface-panel animate-fadeIn flex w-full max-w-sm flex-col gap-4 rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Add Cafe Operator
              </h3>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm mb-2">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="e.g. cafe1"
                    value={form.username}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\s/g, ""); // strictly prevent spaces
                      setForm({ ...form, username: val });
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="e.g. Main Cafeteria"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <AiOutlineEyeInvisible size={20} />
                      ) : (
                        <AiOutlineEye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Campus Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCampusPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                      placeholder="Confirm with campus password"
                      value={form.campusPassword}
                      onChange={(e) =>
                        setForm({ ...form, campusPassword: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCampusPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showCampusPassword ? (
                        <AiOutlineEyeInvisible size={20} />
                      ) : (
                        <AiOutlineEye size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Operator"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Cafe Modal */}
        {cafeToEdit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setCafeToEdit(null)}
          >
            <form
              onSubmit={handleEditCafe}
              autoComplete="off"
              className="surface-panel animate-fadeIn flex w-full max-w-sm flex-col gap-4 rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Edit Cafe Operator
              </h3>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm mb-2">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="e.g. cafe1"
                    value={editForm.username}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\s/g, ""); // strictly prevent spaces
                      setEditForm({ ...editForm, username: val });
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="e.g. Main Cafeteria"
                    value={editForm.displayName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, displayName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    New Password (optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                      placeholder="Leave blank to keep current password"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm({ ...editForm, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <AiOutlineEyeInvisible size={20} />
                      ) : (
                        <AiOutlineEye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Campus Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCampusPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                      placeholder="Confirm with campus password"
                      value={editForm.campusPassword}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          campusPassword: e.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCampusPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showCampusPassword ? (
                        <AiOutlineEyeInvisible size={20} />
                      ) : (
                        <AiOutlineEye size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCafeToEdit(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Operator"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {cafeToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn"
            onClick={() => setCafeToDelete(null)}
          >
            <div
              className="surface-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                Delete Cafe
              </h2>
              <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to delete cafe operator{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {cafeToDelete.name}
                </strong>
                ? This action cannot be undone.
              </p>
              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Campus Password
                </label>
                <div className="relative">
                  <input
                    type={showDeleteCampusPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="Your campus password"
                    value={deleteCampusPassword}
                    onChange={(e) => setDeleteCampusPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeleteCampusPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showDeleteCampusPassword ? (
                      <AiOutlineEyeInvisible size={20} />
                    ) : (
                      <AiOutlineEye size={20} />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setCafeToDelete(null);
                    setDeleteCampusPassword("");
                    setShowDeleteCampusPassword(false);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCafe}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {saving ? "Deleting..." : "Delete Operator"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3 text-white shadow-2xl transition-all duration-300 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
