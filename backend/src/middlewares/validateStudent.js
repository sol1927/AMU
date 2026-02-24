import Student from "../models/student.model.js";

export const validateStudent = async (req, res, next) => {
  const { name, studentId, batch, department } = req.body;

  if (
    !name?.trim() ||
    !studentId?.trim() ||
    !department?.trim() ||
    !batch?.trim()
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check batch is a number
  const batchNum = Number(batch);
  if (isNaN(batchNum)) {
    return res.status(400).json({ message: "Batch must be a number" });
  }

  // Check studentId uniqueness
  const existing = await Student.findOne({ studentId: studentId.trim() });
  if (existing) {
    return res.status(400).json({ message: "Student ID must be unique" });
  }

  // Save parsed values for next middleware
  req.validatedStudent = {
    name: name.trim(),
    studentId: studentId.trim(),
    batch: batchNum,
    department: department.trim(),
  };

  next();
};
