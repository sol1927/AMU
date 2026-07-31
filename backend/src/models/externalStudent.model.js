import dotenv from "dotenv";
import mysql from "mysql2/promise";

const reloadEnv = () => dotenv.config({ override: true });

reloadEnv();

const requiredConfigKeys = [
  "EXTERNAL_DB_HOST",
  "EXTERNAL_DB_PORT",
  "EXTERNAL_DB_USER",
  "EXTERNAL_DB_PASSWORD",
  "EXTERNAL_DB_NAME",
  "EXTERNAL_DB_TABLE",
];

const hasExternalStudentConfig = () =>
  requiredConfigKeys.every((key) => process.env[key]);

const getExternalStudentFieldMapping = () => ({
  studentId: "stId",
  name: "fullName",
  batch: "batchYear",
  department: "deptName",
  campusId: "campId",
  profileUrl: "profileUrl",
});

const assertIdentifier = (value, label) => {
  if (!value || !/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(
      `${label} must contain only letters, numbers, and underscores`,
    );
  }
  return `\`${value}\``;
};

const requiredFieldMappings = ["studentId", "name", "batch", "department"];

const validateRequiredFieldMappings = (fieldMapping) => {
  const missingFields = requiredFieldMappings.filter(
    (key) => !fieldMapping[key],
  );
  if (missingFields.length > 0) {
    throw new Error(
      `External student field mapping is missing: ${missingFields.join(", ")}`,
    );
  }
};

const buildSelectColumns = (fieldMapping) =>
  Object.entries(fieldMapping)
    .filter(([, sourceField]) => sourceField)
    .map(
      ([localField, sourceField]) =>
        `${assertIdentifier(sourceField, `External ${localField} field`)} AS ${assertIdentifier(localField, `Local ${localField} alias`)}`,
    );

const createExternalConnection = () =>
  mysql.createConnection({
    host: process.env.EXTERNAL_DB_HOST,
    port: Number(process.env.EXTERNAL_DB_PORT),
    user: process.env.EXTERNAL_DB_USER,
    password: process.env.EXTERNAL_DB_PASSWORD,
    database: process.env.EXTERNAL_DB_NAME,
  });

const findAll = async ({ campusId } = {}) => {
  reloadEnv();

  if (!hasExternalStudentConfig()) {
    const missingKeys = requiredConfigKeys.filter((key) => !process.env[key]);
    throw new Error(
      `External student DB is not configured. Missing: ${missingKeys.join(", ")}`,
    );
  }

  const table = process.env.EXTERNAL_DB_TABLE;
  const connection = await createExternalConnection();
  try {
    let existingColumns = [];
    try {
      const [columnsInfo] = await connection.execute(`SHOW COLUMNS FROM \`${table}\``);
      existingColumns = columnsInfo.map((col) => (col.Field || col.field || "").toLowerCase());
    } catch (colErr) {
      console.warn("Could not inspect external columns:", colErr.message);
    }

    const fieldMapping = {
      studentId: "stId",
      name: "fullName",
      batch: "batchYear",
      department: "deptName",
      campusId: "campId",
    };

    let detectedProfileUrlCol = null;

    if (existingColumns.length > 0) {
      if (existingColumns.includes("profileurl")) {
        detectedProfileUrlCol = "profileUrl";
      } else if (existingColumns.includes("photourl")) {
        detectedProfileUrlCol = "photoUrl";
      } else if (existingColumns.includes("photo")) {
        detectedProfileUrlCol = "photo";
      }
    }

    if (detectedProfileUrlCol) {
      fieldMapping.profileUrl = detectedProfileUrlCol;
    }

    validateRequiredFieldMappings(fieldMapping);
    const selectedColumns = buildSelectColumns(fieldMapping);
    const safeTable = assertIdentifier(table, "External table");
    const where = [];
    const params = [];

    if (fieldMapping.campusId && campusId !== undefined && campusId !== null) {
      where.push(
        `${assertIdentifier(fieldMapping.campusId, "External campus field")} = ?`,
      );
      params.push(campusId);
    }

    const query = `
      SELECT ${selectedColumns.join(", ")}
      FROM ${safeTable}
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    `;

    const [rows] = await connection.execute(query, params);
    return rows.map((row) => ({
      name: row.name,
      studentId: row.studentId,
      batch: row.batch,
      department: row.department,
      campusId: row.campusId ?? campusId,
      profileUrl: row.profileUrl || "",
    }));
  } finally {
    await connection.end();
  }
};

const ExternalStudentModel = {
  hasExternalStudentConfig,
  findAll,
};

export { hasExternalStudentConfig, findAll };
export default ExternalStudentModel;
