export const DEFAULT_MEAL_STATUS = {
  breakfast: false,
  lunch: false,
  dinner: false,
};

export const getStudentIsInternship = (student = {}) =>
  student.isInternship === true || student.isInternship === 1;

export const getStudentFastingType = (student = {}) =>
  student.fastingType || "not_fasting";

export const getStudentMealStatus = (student = {}) => ({
  ...DEFAULT_MEAL_STATUS,
  ...(student.mealStatus || {}),
});

export const normalizeStudent = (student = {}) => {
  if (!student) return student;

  const normalizedStudent = { ...student };

  normalizedStudent.isInternship = getStudentIsInternship(normalizedStudent);
  normalizedStudent.fastingType = getStudentFastingType(normalizedStudent);
  normalizedStudent.mealStatus = getStudentMealStatus(normalizedStudent);

  return normalizedStudent;
};

export const ensureStudentDefaults = async (StudentModel, baseQuery = {}) => {
  const students = await StudentModel.findAll(baseQuery);
  await Promise.all(
    students.map((student) =>
      StudentModel.updateById(student.id, {
        isInternship: student.isInternship ?? false,
        fastingType: student.fastingType || "not_fasting",
        mealStatus: student.mealStatus || DEFAULT_MEAL_STATUS,
      }),
    ),
  );
};
