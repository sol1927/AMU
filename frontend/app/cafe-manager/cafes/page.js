"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import ConfirmPasswordModal from "../../components/ConfirmPasswordModal";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import {
  HiOutlineUserAdd,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
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
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [toasts, setToasts] = useState([]);
  const pendingRequestsRef = useRef([]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    pendingRequestsRef.current = pendingRequests;
  }, [pendingRequests]);

  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const getRequestDescription = (req) => {
    const type = req.requestType;
    const data = req.pendingData || {};
    if (type === "create_cafe") {
      return `create cafe "${data.displayName || data.name}"`;
    }
    if (type === "update_cafe") {
      return `update cafe "${data.cafeName || data.name}"`;
    }
    if (type === "delete_cafe") {
      return `delete cafe "${data.cafeName}"`;
    }
    return "update profile";
  };

  const fetchPendingRequests = async (isPoll = false) => {
    try {
      const res = await fetch(`${url}/approvals/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const allRequests = data.requests || [];
        const pendingOnly = allRequests.filter((r) => r.status === "pending");

        // Handle resolved requests in the response (approved/rejected)
        allRequests.forEach((req) => {
          if (req.status === "approved") {
            const desc = getRequestDescription(req);
            showToast(`Your request to ${desc} has been approved!`, "success");
            fetchCafes();
          } else if (req.status === "rejected") {
            const desc = getRequestDescription(req);
            showToast(`Your request to ${desc} has been rejected.`, "error");
          }
        });

        // Handle expired requests (if they were pending but are no longer in the list)
        if (isPoll && pendingRequestsRef.current.length > 0) {
          pendingRequestsRef.current.forEach((prevReq) => {
            const exists = allRequests.some((r) => r.id === prevReq.id);
            if (!exists) {
              const desc = getRequestDescription(prevReq);
              showToast(
                `Your request to ${desc} has expired and was automatically rejected.`,
                "error",
              );
            }
          });
        }
        setPendingRequests(pendingOnly);
      }
    } catch (err) {
      console.error("Failed to load pending requests:", err);
    }
  };

  const handleConfirmPasswordSubmit = async (enteredPassword) => {
    setConfirmError("");
    try {
      const verifyRes = await fetch(`${url}/profile/me/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: enteredPassword }),
        credentials: "include",
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setConfirmError(verifyData.message || "Incorrect password.");
        return;
      }

      if (confirmAction.type === "save") {
        setSubmitting(true);
        const { endpoint, method, payload } = confirmAction;
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

        if (res.status === 202) {
          showToast(
            data.message ||
              "Request submitted successfully! Awaiting Campus approval.",
            "success",
          );
        } else {
          showToast("Cafe saved successfully!", "success");
        }

        setIsModalOpen(false);
        fetchCafes();
        fetchPendingRequests();
      } else if (confirmAction.type === "delete") {
        const { cafeId } = confirmAction;
        const res = await fetch(`${url}/campus/cafes/${cafeId}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          if (res.status === 202) {
            showToast(
              data.message ||
                "Deletion request submitted! Awaiting Campus approval.",
              "success",
            );
          } else {
            showToast("Cafe deleted successfully!", "success");
          }
          fetchCafes();
          fetchPendingRequests();
        } else {
          showToast(data.message || "Failed to delete cafe", "error");
        }
      }

      setShowConfirmModal(false);
      setConfirmAction(null);
    } catch (err) {
      setConfirmError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCafeName = (name) => {
    if (!name) return "";
    const numMatch = name.match(/\d+/);
    if (numMatch) {
      return String(numMatch[0]);
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

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
    fetchPendingRequests();

    const interval = setInterval(() => {
      fetchPendingRequests(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser, router]);

  const openAddModal = () => {
    setModalMode("add");
    setSelectedCafe(null);
    setUsername("");
    setDisplayName("");
    setPassword("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (cafe) => {
    setModalMode("edit");
    setSelectedCafe(cafe);
    setUsername(cafe.name || "");
    setDisplayName(cafe.displayName || "");
    setPassword("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const trimmedUsername = username.trim().toLowerCase();
    if (/\s/.test(trimmedUsername)) {
      setFormError("Username cannot contain spaces.");
      return;
    }

    const payload = {
      name: trimmedUsername,
      username: trimmedUsername,
      displayName: displayName || undefined,
    };
    if (modalMode === "add" || password) {
      payload.password = password;
    }

    setConfirmAction({
      type: "save",
      payload,
      endpoint:
        modalMode === "add"
          ? `${url}/campus/cafes`
          : `${url}/campus/cafes/${selectedCafe.id || selectedCafe._id}`,
      method: modalMode === "add" ? "POST" : "PATCH",
    });
    setConfirmError("");
    setShowConfirmModal(true);
  };

  const handleDeleteCafe = async (cafeId) => {
    setConfirmAction({
      type: "delete",
      cafeId,
    });
    setConfirmError("");
    setShowConfirmModal(true);
  };

  const filteredCafes = cafes.filter(
    (cafe) =>
      String(cafe.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(cafe.displayName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  if (!currentUser || currentUser.role !== "cafe manager") return null;

  return (
    <div className="page-shell px-4 pb-10 pt-6 md:px-8">
      <div className="max-w-full space-y-2">
        <div className="surface-panel rounded-[30px] p-4 md:p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
                Cafe Directory
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Manage Cafes
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
                Create and manage cafe accounts allowed to scan student cards.
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01]"
            >
              <HiOutlineUserAdd className="h-5 w-5" />
              Add Cafe Account
            </button>
          </div>

          <div className="mt-2 max-w-md">
            <div
              className="relative rounded-2xl p-1 border border-slate-200"
              style={{ backgroundColor: "var(--app-surface-strong)" }}
            >
              <HiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search cafes by username or display name..."
                className="w-full rounded-2xl bg-transparent py-2.5 pl-11 pr-4 text-sm focus:outline-none"
                style={{
                  backgroundColor: "var(--app-surface-strong)",
                  color: "var(--app-text)",
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
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
            <div className="grid gap-0 justify-items-start md:grid-cols-2 xl:grid-cols-3">
              {filteredCafes.map((cafe) => {
                const cafeTitle =
                  (cafe.displayName || "").trim() || getCafeName(cafe.name);
                return (
                  <div
                    key={cafe.id || cafe._id}
                    className="surface-card relative w-full max-w-[340px] rounded-[28px] p-5 transition hover:-translate-y-1 hover:border-cyan-300"
                  >
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-lg font-black text-cyan-700">
                          {cafe.logo?.url ? (
                            <img
                              src={cafe.logo.url}
                              alt={cafe.displayName || cafe.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (cafe.displayName || cafe.name || "?").charAt(0)
                          )}
                        </div>
                        <div>
                          <h3
                            title={cafeTitle}
                            className="font-bold text-slate-900 dark:text-white text-lg whitespace-normal"
                            style={{ color: "var(--app-text)" }}
                          >
                            {cafeTitle}
                          </h3>
                          <p
                            title={`Username: ${cafe.name}`}
                            className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 max-w-full truncate"
                          >
                            <HiOutlineUser className="h-4 w-4 shrink-0" />
                            Username: {cafe.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Assigned students: {cafe.studentCount ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                      <button
                        onClick={() => openEditModal(cafe)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-[var(--app-surface-strong)] text-[var(--app-text)] py-2 text-xs font-semibold transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <HiOutlinePencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCafe(cafe.id || cafe._id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/30 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="surface-panel rounded-[30px] p-6 md:p-8">
            <div>
              <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400">
                Pending Campus Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                The following additions, modifications, or deletions are
                currently waiting for Campus administrator review.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col justify-between rounded-2xl border border-amber-200/50 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full dark:bg-amber-950/40 dark:text-amber-400">
                        {req.requestType === "create_cafe"
                          ? "Creation"
                          : req.requestType === "update_cafe"
                            ? "Update"
                            : "Deletion"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {req.requestType === "create_cafe" && (
                      <>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">
                          {req.pendingData?.displayName ||
                            req.pendingData?.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                          Username: {req.pendingData?.name}
                        </p>
                      </>
                    )}

                    {req.requestType === "update_cafe" && (
                      <>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">
                          {req.pendingData?.cafeName} (Edit)
                        </h4>
                        {req.pendingData?.name && (
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                            New Username: {req.pendingData.name}
                          </p>
                        )}
                        {req.pendingData?.displayName && (
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">
                            New Display Name: {req.pendingData.displayName}
                          </p>
                        )}
                      </>
                    )}

                    {req.requestType === "delete_cafe" && (
                      <>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">
                          {req.pendingData?.cafeName}
                        </h4>
                        <p className="text-xs text-rose-600 font-semibold mt-1">
                          Requesting Account Deletion
                        </p>
                      </>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    <span>Status:</span>
                    <span className="text-amber-600 font-bold uppercase tracking-wider dark:text-amber-450">
                      Awaiting Review
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-lg sm:w-80 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-center text-xl font-bold text-white">
                {modalMode === "add" ? "Add Cafe Account" : "Edit Cafe Account"}
              </h2>

              {formError && (
                <div className="mb-4">
                  <p
                    className={`rounded-lg p-2 text-center text-sm ${
                      formError.toLowerCase().includes("success")
                        ? "border border-green-500/30 bg-green-500/20 text-green-400"
                        : "border border-red-500/30 bg-red-500/20 text-red-400"
                    }`}
                  >
                    {formError}
                  </p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="mb-3">
                  <label
                    htmlFor="cafe-username"
                    className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2"
                  >
                    Username
                  </label>
                  <input
                    id="cafe-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/\s/g, ""))
                    }
                    placeholder="Cafe username"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="cafe-display-name"
                    className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2"
                  >
                    Display Name
                  </label>
                  <input
                    id="cafe-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="cafe-password"
                    className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="cafe-password"
                      type={showPassword ? "text" : "password"}
                      required={modalMode === "add"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        modalMode === "add"
                          ? "At least 6 characters"
                          : "Leave blank to keep current password"
                      }
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-10 text-white placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <AiOutlineEyeInvisible className="h-5 w-5" />
                      ) : (
                        <AiOutlineEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-purple-800/50 ${
                      submitting
                        ? "cursor-not-allowed opacity-50 hover:scale-100"
                        : ""
                    }`}
                  >
                    {submitting ? "Saving..." : "Save Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showConfirmModal && (
          <ConfirmPasswordModal
            title={
              confirmAction?.type === "delete"
                ? "Confirm Account Deletion"
                : confirmAction?.method === "POST"
                  ? "Confirm Cafe Addition"
                  : "Confirm Cafe Modification"
            }
            placeholder="Enter Cafe Manager password"
            onSubmit={handleConfirmPasswordSubmit}
            onCancel={() => {
              setShowConfirmModal(false);
              setConfirmAction(null);
            }}
            errorMessage={confirmError}
          />
        )}
      </div>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl transition-all duration-300 animate-fade-in ${
              t.type === "success"
                ? "bg-emerald-600 text-white shadow-emerald-500/25"
                : "bg-rose-600 text-white shadow-rose-500/25"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
