export const parseCampusId = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const normalizedValue = String(value).trim();

  if (!/^\d+$/.test(normalizedValue)) return null;

  const campusId = Number(normalizedValue);

  if (!Number.isSafeInteger(campusId) || campusId <= 0) {
    return null;
  }

  return campusId;
};

export const getStudentCampusQuery = (campus = {}) => {
  const campusId = parseCampusId(campus.campusId);

  if (campusId !== null) {
    return { campusId };
  }

  return { campusId: null };
};

export const getStudentCampusSyncQuery = (campus = {}, previousCampusId) => {
  const filters = [];
  const currentCampusId = parseCampusId(campus.campusId);
  const oldCampusId = parseCampusId(previousCampusId);

  if (currentCampusId !== null) {
    filters.push({ campusId: currentCampusId });
  }

  if (
    oldCampusId !== null &&
    !filters.some((filter) => filter.campusId === oldCampusId)
  ) {
    filters.push({ campusId: oldCampusId });
  }

  if (filters.length === 0) {
    return { campusId: null };
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return { $or: filters };
};
