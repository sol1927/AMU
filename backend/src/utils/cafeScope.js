export const normalizeCafeCount = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
};

export const buildCafeNumbers = (cafeCount = 1) =>
  Array.from(
    { length: normalizeCafeCount(cafeCount) },
    (_, index) => index + 1,
  );

export const normalizeBatchCafeAssignments = (
  value,
  cafeCount = 1,
  allowedBatches = null,
) => {
  const allowedCafeNumbers = new Set(buildCafeNumbers(cafeCount));
  const allowedBatchSet = Array.isArray(allowedBatches)
    ? new Set(allowedBatches.map((batch) => String(batch)))
    : null;
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return Object.entries(source).reduce(
    (accumulator, [batchKey, cafeNumber]) => {
      const normalizedBatch = String(batchKey ?? "").trim();
      const normalizedCafeNumber = Number(cafeNumber);

      if (!normalizedBatch) {
        return accumulator;
      }

      if (allowedBatchSet && !allowedBatchSet.has(normalizedBatch)) {
        return accumulator;
      }

      if (!allowedCafeNumbers.has(normalizedCafeNumber)) {
        return accumulator;
      }

      accumulator[normalizedBatch] = normalizedCafeNumber;
      return accumulator;
    },
    {},
  );
};

export const getAssignedCafeNumberForBatch = (campus = {}, batch) => {
  const assignments =
    campus?.batchCafeAssignments &&
    typeof campus.batchCafeAssignments === "object" &&
    !Array.isArray(campus.batchCafeAssignments)
      ? campus.batchCafeAssignments
      : {};

  const batchKey = String(batch ?? "").trim();
  if (!batchKey) {
    return null;
  }

  const assignedCafeNumber = Number(assignments[batchKey]);
  return Number.isInteger(assignedCafeNumber) && assignedCafeNumber > 0
    ? assignedCafeNumber
    : null;
};

export const getEffectiveStudentCafeNumber = (student = {}, campus = {}) => {
  const explicitCafe = Number(student?.cafeNumber);

  if (explicitCafe === 0) {
    return null;
  }

  if (Number.isInteger(explicitCafe) && explicitCafe > 0) {
    return explicitCafe;
  }

  return getAssignedCafeNumberForBatch(campus, student?.batch);
};

export const getStudentCafeMismatchMessage = (student = {}, campus = {}) => {
  const assignedCafe = getEffectiveStudentCafeNumber(student, campus);

  if (assignedCafe) {
    return `This student is assigned to Cafe ${assignedCafe}.`;
  }

  return "This student is not assigned to any cafe.";
};

export const filterStudentsForCafeNumber = (
  students = [],
  campus = {},
  cafeNumber,
) => {
  const normalizedCafeNumber = Number(cafeNumber);

  if (!Number.isInteger(normalizedCafeNumber) || normalizedCafeNumber < 1) {
    return students;
  }

  return students.filter((student) => {
    const assignedCafeNumber = getEffectiveStudentCafeNumber(student, campus);
    return assignedCafeNumber === normalizedCafeNumber;
  });
};

export const getCafeDisplayName = (campusName, cafeNumber) => {
  const normalizedCafeNumber = Number(cafeNumber);

  if (!Number.isInteger(normalizedCafeNumber) || normalizedCafeNumber < 1) {
    return campusName || "Campus";
  }

  return `${campusName || "Campus"} Cafe ${normalizedCafeNumber}`;
};
