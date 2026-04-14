export const DEFAULT_MEAL_STATUS = {
  breakfast: false,
  lunch: false,
  dinner: false,
};

export const getStudentIsInternship = (student = {}) =>
  student.isInternship === true;

export const getStudentFastingType = (student = {}) =>
  student.fastingType || "not_fasting";

export const getStudentMealStatus = (student = {}) => ({
  ...DEFAULT_MEAL_STATUS,
  ...(student.mealStatus || {}),
});

export const normalizeStudent = (student = {}) => {
  if (!student) return student;

  const normalizedStudent =
    typeof student.toObject === "function" ? student.toObject() : { ...student };

  normalizedStudent.isInternship = getStudentIsInternship(normalizedStudent);
  normalizedStudent.fastingType = getStudentFastingType(normalizedStudent);
  normalizedStudent.mealStatus = getStudentMealStatus(normalizedStudent);

  return normalizedStudent;
};

export const ensureStudentDefaults = async (StudentModel, baseQuery = {}) => {
  await Promise.all([
    StudentModel.updateMany(
      { ...baseQuery, isInternship: { $exists: false } },
      { $set: { isInternship: false } },
    ),
    StudentModel.updateMany(
      { ...baseQuery, fastingType: { $exists: false } },
      { $set: { fastingType: "not_fasting" } },
    ),
    StudentModel.updateMany(
      { ...baseQuery, mealStatus: { $exists: false } },
      { $set: { mealStatus: DEFAULT_MEAL_STATUS } },
    ),
  ]);
};
