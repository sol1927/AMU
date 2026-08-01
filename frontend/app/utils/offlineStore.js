/**
 * offlineStore.js
 * All offline data persisted to localStorage.
 * Keys are namespaced so data from different sessions/campuses never collides.
 * All writes are synchronous — data survives power loss immediately.
 */

const PREFIX = "ofs";

// ─── Safe localStorage wrappers ──────────────────────────────────────────────

const safeGet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode — silently ignore
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

// ─── Student list ─────────────────────────────────────────────────────────────

const studentKey = (campusId, cafeNum) =>
  `${PREFIX}:students:${campusId}:${cafeNum}`;

export const saveStudents = (campusId, cafeNum, students) => {
  safeSet(studentKey(campusId, cafeNum), { students, savedAt: Date.now() });
};

export const loadStudents = (campusId, cafeNum) => {
  const data = safeGet(studentKey(campusId, cafeNum));
  return Array.isArray(data?.students) ? data.students : [];
};

// ─── Meal schedule ────────────────────────────────────────────────────────────

const scheduleKey = (campusId) => `${PREFIX}:schedule:${campusId}`;

export const saveSchedule = (campusId, schedule) => {
  safeSet(scheduleKey(campusId), { schedule, savedAt: Date.now() });
};

export const loadSchedule = (campusId) => {
  const data = safeGet(scheduleKey(campusId));
  return data?.schedule || null;
};

// ─── Scanned student IDs for a session ───────────────────────────────────────

const scannedKey = (campusId, cafeNum, date, mealType) =>
  `${PREFIX}:scanned:${campusId}:${cafeNum}:${date}:${mealType}`;

export const markScanned = (campusId, cafeNum, date, mealType, studentId) => {
  if (!campusId || !cafeNum || !date || !mealType || !studentId) return;
  const key = scannedKey(campusId, cafeNum, date, mealType);
  const current = safeGet(key);
  const ids = Array.isArray(current?.ids) ? current.ids : [];
  const sid = String(studentId);
  if (!ids.includes(sid)) {
    ids.push(sid);
    safeSet(key, { ids, updatedAt: Date.now() });
  }
};

export const isScannedLocally = (campusId, cafeNum, date, mealType, studentId) => {
  if (!campusId || !cafeNum || !date || !mealType || !studentId) return false;
  const current = safeGet(scannedKey(campusId, cafeNum, date, mealType));
  const ids = Array.isArray(current?.ids) ? current.ids : [];
  return ids.includes(String(studentId));
};

export const loadScannedIds = (campusId, cafeNum, date, mealType) => {
  const current = safeGet(scannedKey(campusId, cafeNum, date, mealType));
  return new Set(Array.isArray(current?.ids) ? current.ids.map(String) : []);
};

/**
 * Merge server-provided scanned IDs into local set.
 * Adds any IDs that are on the server but not locally known.
 */
export const mergeScannedIds = (campusId, cafeNum, date, mealType, serverIds) => {
  if (!Array.isArray(serverIds) || serverIds.length === 0) return;
  if (!campusId || !cafeNum || !date || !mealType) return;
  const key = scannedKey(campusId, cafeNum, date, mealType);
  const current = safeGet(key);
  const localIds = Array.isArray(current?.ids) ? current.ids : [];
  const localSet = new Set(localIds.map(String));
  let changed = false;
  for (const id of serverIds) {
    const sid = String(id);
    if (!localSet.has(sid)) {
      localSet.add(sid);
      changed = true;
    }
  }
  if (changed) {
    safeSet(key, { ids: Array.from(localSet), updatedAt: Date.now() });
  }
};

export const clearSessionScanned = (campusId, cafeNum, date, mealType) => {
  safeRemove(scannedKey(campusId, cafeNum, date, mealType));
};

// ─── Pending upload queue ─────────────────────────────────────────────────────

const pendingKey = (campusId, cafeNum) =>
  `${PREFIX}:pending:${campusId}:${cafeNum}`;

export const addPendingScan = (campusId, cafeNum, scan) => {
  if (!campusId || !cafeNum || !scan?.localId) return;
  const key = pendingKey(campusId, cafeNum);
  const current = safeGet(key);
  const items = Array.isArray(current) ? current : [];
  // Avoid duplicates
  if (!items.find((i) => i.localId === scan.localId)) {
    items.push(scan);
    safeSet(key, items);
  }
};

export const getPendingScans = (campusId, cafeNum) => {
  const current = safeGet(pendingKey(campusId, cafeNum));
  return Array.isArray(current) ? current : [];
};

export const removePendingScan = (campusId, cafeNum, localId) => {
  const key = pendingKey(campusId, cafeNum);
  const current = safeGet(key);
  if (!Array.isArray(current)) return;
  const filtered = current.filter((i) => i.localId !== localId);
  safeSet(key, filtered);
};

export const clearPendingScans = (campusId, cafeNum) => {
  safeRemove(pendingKey(campusId, cafeNum));
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────

const dashStatsKey = (campusId, cafeNum) =>
  `${PREFIX}:dashstats:${campusId}:${cafeNum}`;

export const saveDashboardStats = (campusId, cafeNum, stats) => {
  safeSet(dashStatsKey(campusId, cafeNum), { ...stats, savedAt: Date.now() });
};

export const loadDashboardStats = (campusId, cafeNum) => {
  return safeGet(dashStatsKey(campusId, cafeNum));
};

// ─── Full student list (for students page) ────────────────────────────────────

const cafeStudentsKey = (campusId, cafeNum) =>
  `${PREFIX}:cafestudents:${campusId}:${cafeNum}`;

export const saveCafeStudents = (campusId, cafeNum, students, totalStudents) => {
  safeSet(cafeStudentsKey(campusId, cafeNum), {
    students,
    totalStudents,
    savedAt: Date.now(),
  });
};

export const loadCafeStudents = (campusId, cafeNum) => {
  return safeGet(cafeStudentsKey(campusId, cafeNum));
};

// ─── Cafes list ───────────────────────────────────────────────────────────────

const cafesKey = (campusId) => `${PREFIX}:cafes:${campusId}`;

export const saveCafes = (campusId, cafes) => {
  safeSet(cafesKey(campusId), cafes);
};

export const loadCafes = (campusId) => {
  return safeGet(cafesKey(campusId)) || [];
};
