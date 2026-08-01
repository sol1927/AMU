"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addPendingScan,
  getPendingScans,
  mergeScannedIds,
  removePendingScan,
  saveSchedule,
  saveStudents,
} from "./offlineStore.js";
import { useOnlineStatus } from "./useOnlineStatus.js";

const API = process.env.NEXT_PUBLIC_API_URL;
const SYNC_INTERVAL_MS = 10_000; // 10 s background poll

/**
 * useSyncManager
 *
 * Orchestrates all sync and upload behaviour for the scan page.
 *
 * @param {{ campusId: number|string, cafeNum: number }} params
 * @returns {{
 *   isOnline: boolean,
 *   isSyncing: boolean,
 *   pendingCount: number,
 *   lastSyncAt: Date|null,
 *   enqueueScan: (scan: object) => void,
 *   syncNow: () => void,
 * }}
 */
export const useSyncManager = ({ campusId, cafeNum }) => {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  // Keep latest values accessible inside callbacks without re-creating them
  const campusIdRef = useRef(campusId);
  const cafeNumRef = useRef(cafeNum);
  const isOnlineRef = useRef(isOnline);
  const syncingRef = useRef(false); // prevent concurrent syncs

  campusIdRef.current = campusId;
  cafeNumRef.current = cafeNum;
  isOnlineRef.current = isOnline;

  // ── Refresh pendingCount from localStorage ──────────────────────────────────
  const refreshPendingCount = useCallback(() => {
    const cid = campusIdRef.current;
    const cn = cafeNumRef.current;
    if (!cid || !cn) return;
    setPendingCount(getPendingScans(cid, cn).length);
  }, []);

  // ── Upload pending scans to server ──────────────────────────────────────────
  const uploadPending = useCallback(async () => {
    const cid = campusIdRef.current;
    const cn = cafeNumRef.current;
    if (!cid || !cn) return;

    const pending = getPendingScans(cid, cn);
    if (pending.length === 0) return;

    try {
      const res = await fetch(`${API}/meal/students/offline-scan-upload`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans: pending }),
      });

      if (!res.ok) return; // network/auth error — keep items in queue

      const data = await res.json();
      if (!Array.isArray(data?.results)) return;

      for (const result of data.results) {
        // Remove from queue on success OR duplicate — both mean server has it
        if (result.status === "ok" || result.status === "duplicate") {
          removePendingScan(cid, cn, result.localId);
        }
        // "error", "not_found", "time_up", etc. — leave in queue for retry
      }
    } catch {
      // Network error — leave items in queue
    }

    refreshPendingCount();
  }, [refreshPendingCount]);

  // ── Sync session state (scanned IDs) from server ───────────────────────────
  const syncSession = useCallback(async () => {
    const cid = campusIdRef.current;
    const cn = cafeNumRef.current;
    if (!cid || !cn) return;

    try {
      const res = await fetch(`${API}/meal/sync/session`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json();

      if (data.mealSchedule) {
        saveSchedule(cid, data.mealSchedule);
      }

      if (data.currentMealType && Array.isArray(data.scannedStudentIds)) {
        mergeScannedIds(
          cid,
          cn,
          data.date,
          data.currentMealType,
          data.scannedStudentIds,
        );
      }

      setLastSyncAt(new Date());
    } catch {
      // Ignore — will retry on next poll
    }
  }, []);

  // ── Sync student list from server ──────────────────────────────────────────
  const syncStudents = useCallback(async () => {
    const cid = campusIdRef.current;
    const cn = cafeNumRef.current;
    if (!cid || !cn) return;

    try {
      const res = await fetch(`${API}/meal/sync/students`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data?.students)) {
        saveStudents(cid, cn, data.students);
      }
    } catch {
      // Ignore
    }
  }, []);

  // ── Full sync: students + session + pending upload ─────────────────────────
  const fullSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isOnlineRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      // Run student sync and session sync in parallel, then upload pending
      await Promise.all([syncStudents(), syncSession()]);
      await uploadPending();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [syncStudents, syncSession, uploadPending]);

  // ── Light sync: session + pending upload (no student re-download) ──────────
  const lightSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isOnlineRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      await Promise.all([syncSession(), uploadPending()]);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [syncSession, uploadPending]);

  // ── On mount / campusId+cafeNum available: full sync ──────────────────────
  useEffect(() => {
    if (!campusId || !cafeNum) return;
    refreshPendingCount();
    if (isOnline) {
      fullSync();
    }
    // campusId and cafeNum are the only deps needed — fullSync intentionally excluded
  }, [campusId, cafeNum]);

  // ── When going online after being offline: full sync ──────────────────────
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (!prevOnlineRef.current && isOnline) {
      // Just came back online
      fullSync();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, fullSync]);

  // ── Background 10 s poll while online ─────────────────────────────────────
  useEffect(() => {
    if (!campusId || !cafeNum) return undefined;

    const interval = setInterval(() => {
      if (isOnlineRef.current) {
        lightSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [campusId, cafeNum, lightSync]);

  // ── enqueueScan: add to pending queue and immediately attempt upload ───────
  const enqueueScan = useCallback(
    (scan) => {
      const cid = campusIdRef.current;
      const cn = cafeNumRef.current;
      if (!cid || !cn) return;

      addPendingScan(cid, cn, scan);
      refreshPendingCount();

      // Fire-and-forget immediate upload attempt if online
      if (isOnlineRef.current) {
        lightSync();
      }
    },
    [lightSync, refreshPendingCount],
  );

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    enqueueScan,
    syncNow: fullSync,
  };
};
