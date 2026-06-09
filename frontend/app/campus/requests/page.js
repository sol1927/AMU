"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCampus } from "../../context/CampusContext";
import CampusNavbar from "../../components/CampusNavbar";
import { 
  HiOutlineClipboardList,
  HiCheck,
  HiX,
  HiOutlineUser,
  HiOutlinePlusCircle,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineShieldCheck
} from "react-icons/hi";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function CampusRequestsPage() {
  const router = useRouter();
  const { currentCampus, loading: campusLoading } = useCampus();

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`${url}/approvals`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      } else {
        throw new Error(getApiMessage(data, "Failed to load requests."));
      }
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to load approval requests."));
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (!campusLoading && !currentCampus) {
      router.replace("/");
      return;
    }
    if (currentCampus) {
      fetchRequests();
      const interval = setInterval(() => {
        fetch(`${url}/approvals`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) setRequests(data.requests || []);
          })
          .catch((err) => console.error("Request poll error:", err));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [campusLoading, currentCampus, router, fetchRequests]);

  const handleApprove = async (id) => {
    setProcessingId(id);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${url}/approvals/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getApiMessage(data, "Failed to approve request."));
      }
      setMessage("Request approved and changes applied successfully!");
      fetchRequests();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to approve request."));
      setTimeout(() => setError(""), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${url}/approvals/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getApiMessage(data, "Failed to reject request."));
      }
      setMessage("Request rejected successfully.");
      fetchRequests();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reject request."));
      setTimeout(() => setError(""), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const getRequestBadge = (type) => {
    switch (type) {
      case "create_cafe":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-400 rounded-full border border-emerald-200/30">
            <HiOutlinePlusCircle className="h-3.5 w-3.5" />
            Create Cafe
          </span>
        );
      case "update_cafe":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-400 rounded-full border border-blue-200/30">
            <HiOutlinePencilAlt className="h-3.5 w-3.5" />
            Update Cafe
          </span>
        );
      case "delete_cafe":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/35 dark:text-rose-400 rounded-full border border-rose-200/30">
            <HiOutlineTrash className="h-3.5 w-3.5" />
            Delete Cafe
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-400 rounded-full border border-amber-200/30">
            <HiOutlineShieldCheck className="h-3.5 w-3.5" />
            Profile Update
          </span>
        );
    }
  };

  if (campusLoading || !currentCampus) {
    return (
      <div className="page-shell p-10 pt-28 text-slate-500">Loading Campus...</div>
    );
  }

  return (
    <div className="page-shell flex min-h-screen flex-col overflow-y-auto pt-20 pb-10">
      <CampusNavbar />

      <main className="flex-1 flex flex-col p-4 pt-24 sm:p-8 max-w-6xl mx-auto w-full">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <HiOutlineClipboardList className="h-8 w-8 text-blue-500" />
              Approvals Board
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review and act on cafe modifications or manager-submitted account requests.
            </p>
          </div>
        </div>

        {/* Global Toast Message Feedback */}
        {message && (
          <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-600 text-center animate-fade-in">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-600 text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Requests Loading State */}
        {loadingRequests ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800"></div>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm font-medium">Fetching verification queue...</p>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center rounded-[30px] border border-dashed border-slate-200/80 bg-white/40 p-16 text-center dark:border-slate-800 dark:bg-slate-900/10 backdrop-blur-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 shadow-inner mb-4">
              <HiOutlineClipboardList className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">All caught up!</h3>
            <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
              There are no pending requests or updates waiting for your approval right now.
            </p>
          </div>
        ) : (
          /* Requests Grid */
          <div className="grid gap-6 sm:grid-cols-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="surface-card rounded-[2.5rem] p-6 border border-slate-200/80 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-950 dark:text-blue-400 shadow-inner">
                        <HiOutlineUser className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {req.requesterName || "Manager"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {req.requesterEmail || "Cafe Manager"}
                        </p>
                      </div>
                    </div>
                    {getRequestBadge(req.requestType)}
                  </div>

                  {/* Request Data Body */}
                  <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    {req.requestType === "create_cafe" && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Proposed User:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{req.pendingData?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Display Name:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{req.pendingData?.displayName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Password:</span>
                          <span className="font-bold text-slate-500 italic">•••••• (Set by Manager)</span>
                        </div>
                      </>
                    )}

                    {req.requestType === "update_cafe" && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Cafe Reference:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{req.pendingData?.cafeName || "Cafe Account"}</span>
                        </div>
                        {req.pendingData?.name && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">New Username:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{req.pendingData.name}</span>
                          </div>
                        )}
                        {req.pendingData?.displayName !== undefined && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">New Display Name:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{req.pendingData.displayName || "N/A"}</span>
                          </div>
                        )}
                        {req.pendingData?.password && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">Password Change:</span>
                            <span className="font-bold text-amber-500 italic">•••••• (Requested Reset)</span>
                          </div>
                        )}
                      </>
                    )}

                    {req.requestType === "delete_cafe" && (
                      <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold py-1">
                        <span>Remove Cafe Account:</span>
                        <span className="font-bold text-slate-900 dark:text-white bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-200/30">{req.pendingData?.cafeName}</span>
                      </div>
                    )}

                    {req.requestType === "profile_update" && (
                      <>
                        {req.pendingData?.name && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">New Name:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{req.pendingData.name}</span>
                          </div>
                        )}
                        {req.pendingData?.email && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">New Email:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{req.pendingData.email}</span>
                          </div>
                        )}
                        {req.pendingData?.password && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">New Password:</span>
                            <span className="font-bold text-amber-500 italic">•••••• (Reset requested)</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    disabled={processingId !== null}
                    onClick={() => handleReject(req.id)}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400 py-2.5 rounded-2xl text-xs font-bold transition border border-rose-200/40 dark:border-rose-900/35 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <HiX className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    disabled={processingId !== null}
                    onClick={() => handleApprove(req.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                  >
                    <HiCheck className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
