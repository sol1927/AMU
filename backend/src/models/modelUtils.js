export const toId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const withRecordId = (row = {}) => ({
  ...row,
  _id: row.id?.toString?.() ?? row._id ?? null,
});

export const mapRows = (rows = [], mapper = (value) => value) =>
  rows.map((row) => withRecordId(mapper(row)));

export const mapRow = (row, mapper = (value) => value) =>
  row ? withRecordId(mapper(row)) : null;

export const omitPassword = (row) => {
  if (!row) return row;
  const rest = { ...row };
  delete rest.password;
  return rest;
};

export const buildInClause = (values = []) =>
  values.map(() => "?").join(", ");

export const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const pad = (part) => String(part).padStart(2, "0");
    return [
      value.getFullYear(),
      pad(value.getMonth() + 1),
      pad(value.getDate()),
    ].join("-") + " " + [
      pad(value.getHours()),
      pad(value.getMinutes()),
      pad(value.getSeconds()),
    ].join(":");
  }
  return value;
};

export const parseJsonField = (value, fallback) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
