CREATE DATABASE IF NOT EXISTS university_external_db;

USE university_external_db;

CREATE TABLE IF NOT EXISTS external_students (
  studentN VARCHAR(255) NOT NULL PRIMARY KEY,
  fullName VARCHAR(255) NOT NULL,
  batchYear INT NOT NULL,
  deptName VARCHAR(255) NOT NULL,
  campusCode INT NOT NULL,
  cafe TINYINT NOT NULL DEFAULT 1
);

INSERT INTO external_students
  (studentN, fullName, batchYear, deptName, campusCode, cafe)
VALUES
  ('AMU001', 'Solomon Test', 2016, 'Computer Science', 1, 1),
  ('AMU002', 'Marta Example', 2016, 'Information Technology', 1, 1),
  ('AMU003', 'Dawit Demo', 2015, 'Software Engineering', 2, 1)
ON DUPLICATE KEY UPDATE
  fullName = VALUES(fullName),
  batchYear = VALUES(batchYear),
  deptName = VALUES(deptName),
  campusCode = VALUES(campusCode),
  cafe = VALUES(cafe);
