"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import {
  HiOutlineUserAdd,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineKey,
  HiOutlineMail,
  HiOutlineUser,
} from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CafeCafesPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  const [cafes, setCafes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [selectedCafe, setSelectedCafe] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCafes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${url}/campus/cafes`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCafes(data.cafes || []);
      }
    } catch (err) {
      console.error("Failed to load cafes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "cafe manager") {
      router.replace("/");
      return;
    }
    fetchCafes();
  }, [currentUser, router]);

  const openAddModal = () => {
    setModalMode("add");
    setSelectedCafe(null);
    setName("");
    setEmail("");
    setPassword("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (cafe) => {
    setModalMode("edit");
    setSelectedCafe(cafe);
    setName(cafe.name);
    setEmail(cafe.email || cafe.name);
    setPassword("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = { name, username: email };
    if (modalMode === "add" || password) {
      payload.password = password;
    }

    try {
      const endpoint =
        modalMode === "add"
          ? `${url}/campus/cafes`
          : `${url}/campus/cafes/${selectedCafe.id}`;
      const method = modalMode === "add" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save cafe");
      }

      setIsModalOpen(false);
      fetchCafes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCafe = async (cafeId) => {
    if (!confirm("Are you sure you want to delete this cafe account?")) return;

    try {
      const res = await fetch(`${url}/campus/cafes/${cafeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchCafes();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete cafe");
      }
    } catch (err) {
      console.error("Failed to delete cafe:", err);
    }
  };

  const filteredCafes = cafes.filter(
    (cafe) =>
      String(cafe.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(cafe.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!currentUser || currentUser.role !== "cafe manager") return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Cafe Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create and manage cafe accounts allowed to scan student cards.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 text-sm transition hover:scale-105 active:scale-95"
        >
          <HiOutlineUserAdd className="h-5 w-5" />
          Add Cafe Account
        </button>
      </div>

      {/* Main Container */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative max-w-md">
          <HiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search cafes by name or username..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-950"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800"></div>
            <p className="text-slate-500 mt-4 text-sm">Loading cafes...</p>
          </div>
        ) : filteredCafes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 dark:border-slate-800">
            <p className="text-slate-400 text-sm">
              {searchTerm
                ? "No cafes match your query."
                : "No cafes have been created yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCafes.map((cafe) => (
              <div
                key={cafe.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/60 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-950/20"
              >
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {cafe.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 break-all">
                    <HiOutlineUser className="h-4 w-4 shrink-0" />
                    {cafe.email || cafe.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-6 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                  <button
                    onClick={() => openEditModal(cafe)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCafe(cafe.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/30 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 mx-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {modalMode === "add" ? "Add Cafe Account" : "Edit Cafe Account"}
            </h2>

            {formError && (
              <p className="mb-4 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-900/30">
                {formError}
              </p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Cafe Name
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Samuel Ayele"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Username
                </label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. samuel_ayele"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Password{" "}
                  {modalMode === "edit" && (
                    <span className="text-slate-400 font-normal lowercase">
                      (leave blank to keep current)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <HiOutlineKey className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required={modalMode === "add"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 dark:text-slate-300 font-semibold text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed font-bold text-white transition text-sm"
                >
                  {submitting ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
