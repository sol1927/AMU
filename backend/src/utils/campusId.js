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
  const campusIds = [];
  const currentCampusId = parseCampusId(campus.campusId);
  const oldCampusId = parseCampusId(previousCampusId);

  if (currentCampusId !== null) {
    campusIds.push(currentCampusId);
  }

  if (
    oldCampusId !== null &&
    !campusIds.includes(oldCampusId)
  ) {
    campusIds.push(oldCampusId);
  }

  if (campusIds.length === 0) {
    return { campusId: null };
  }

  if (campusIds.length === 1) {
    return { campusId: campusIds[0] };
  }

  return { campusIds };
};
