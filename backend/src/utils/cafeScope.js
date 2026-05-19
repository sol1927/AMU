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

export const filterStudentsForCafeNumber = (
  students = [],
  campus = {},
  cafeNumber,
) => {
  const normalizedCafeNumber = Number(cafeNumber);
  const normalizedCafeCount = normalizeCafeCount(campus?.cafeCount);

  if (!Number.isInteger(normalizedCafeNumber) || normalizedCafeNumber < 1) {
    return students;
  }

  if (normalizedCafeCount <= 1) {
    return students;
  }

  return students.filter((student) => {
    const studentCafeNumber = Number(student?.cafeNumber);
    if (studentCafeNumber === 0) {
      return false;
    }

    if (Number.isInteger(studentCafeNumber) && studentCafeNumber > 0) {
      return studentCafeNumber === normalizedCafeNumber;
    }

    const assignedCafeNumber = getAssignedCafeNumberForBatch(
      campus,
      student?.batch,
    );
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
