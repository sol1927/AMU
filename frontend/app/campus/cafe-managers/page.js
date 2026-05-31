"use client";

import { useEffect, useState } from "react";
import CampusNavbar from "../../components/CampusNavbar";
import { BsArrowClockwise, BsThreeDotsVertical } from "react-icons/bs";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function CafeManagersPage() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // Edit and Delete state
  const [managerToEdit, setManagerToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" });
  const [managerToDelete, setManagerToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchManagers = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const res = await fetch("/api/campus/cafe-managers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch cafe managers");
      setManagers(data.cafeManagers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchManagers();
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
    if (managerToEdit) {
      setEditForm({
        name: managerToEdit.name || "",
        email: managerToEdit.email || "",
        password: "",
      });
      setError("");
      setShowPassword(false);
    }
  }, [managerToEdit]);

  const handleAddManager = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const email = form.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/campus/cafe-managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add cafe manager");
      setForm({ name: "", email: "", password: "" });
      setShowAddModal(false);
      showToast("Cafe manager registered successfully", "success");
      fetchManagers({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditManager = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const email = editForm.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name: editForm.name.trim(),
        email: email,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      const res = await fetch(`/api/campus/cafe-managers?id=${managerToEdit.id || managerToEdit._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update cafe manager");
      setManagerToEdit(null);
      showToast("Cafe manager updated successfully", "success");
      fetchManagers({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteManager = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/campus/cafe-managers?id=${managerToDelete.id || managerToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete cafe manager");
      setManagerToDelete(null);
      showToast("Cafe manager deleted successfully", "success");
      fetchManagers({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
                  Manager Directory
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                  Manage Cafe Managers
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-400 md:text-base">
                  This page displays the registered cafe manager accounts for your campus. Cafe managers oversee the general operational statuses and scanner activity.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fetchManagers({ silent: true })}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BsArrowClockwise className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  onClick={() => {
                    setError("");
                    setShowPassword(false);
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01]"
                >
                  + Add Cafe Manager
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="surface-card rounded-[28px] p-6 animate-pulse">
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
            ) : managers.length > 0 ? (
              managers.map((manager) => (
                <div
                  key={manager.id || manager._id}
                  className="surface-card relative rounded-[28px] p-6 transition hover:-translate-y-1 hover:border-cyan-300 dark:hover:border-cyan-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-lg font-black text-indigo-700 dark:text-indigo-400">
                        {manager.name?.[0]?.toUpperCase() || "M"}
                      </div>

                      <div>
                        <h2 
                          title={manager.name}
                          className="text-xl font-bold text-slate-900 dark:text-white max-w-[150px] truncate"
                        >
                          {manager.name}
                        </h2>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
                          Cafe Manager
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        className="menu-button rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === (manager.id || manager._id) ? null : (manager.id || manager._id)
                          )
                        }
                      >
                        <BsThreeDotsVertical className="h-5 w-5 text-slate-500" />
                      </button>

                      {openMenuId === (manager.id || manager._id) && (
                        <div className="menu-button absolute right-0 top-full z-50 mt-2 w-28 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-2xl">
                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => {
                              setManagerToEdit(manager);
                              setOpenMenuId(null);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 transition hover:bg-red-500/10"
                            onClick={() => {
                              setManagerToDelete(manager);
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
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Account Status</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full ${
                          manager.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      />
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {manager.isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                    {manager.lastActiveAt && (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Active: {new Date(manager.lastActiveAt).toLocaleString([], {
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
                      Login Email
                    </p>
                    <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">
                      {manager.email}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-950/50 p-8 text-center text-slate-600 dark:text-slate-400 md:col-span-2 xl:col-span-3">
                <div className="text-xl font-semibold text-slate-900 dark:text-white">
                  No cafe managers registered
                </div>
                <div className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                  Add your first cafe manager to delegate oversight.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Cafe Manager Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          >
            <form
              onSubmit={handleAddManager}
              autoComplete="off"
              className="surface-panel animate-fadeIn flex w-full max-w-sm flex-col gap-4 rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Cafe Manager</h3>

              {error && <div className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</div>}

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="e.g. John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="manager@campus.edu"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
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
                  {saving ? "Saving..." : "Save Manager"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Cafe Manager Modal */}
        {managerToEdit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setManagerToEdit(null)}
          >
            <form
              onSubmit={handleEditManager}
              autoComplete="off"
              className="surface-panel animate-fadeIn flex w-full max-w-sm flex-col gap-4 rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Cafe Manager</h3>

              {error && <div className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</div>}

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    placeholder="Email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">New Password (optional)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                      placeholder="Leave blank to keep current password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setManagerToEdit(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Manager"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {managerToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn"
            onClick={() => setManagerToDelete(null)}
          >
            <div
              className="surface-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                Delete Cafe Manager
              </h2>
              <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to delete cafe manager <strong className="text-slate-800 dark:text-slate-200">{managerToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setManagerToDelete(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteManager}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {saving ? "Deleting..." : "Delete Manager"}
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
