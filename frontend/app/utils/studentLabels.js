export const getFastingLabel = (fastingType) => {
  if (fastingType === "fasting") return "Orthodox Fasting";
  if (fastingType === "sunday_fasting") return "Sunday Fasting";
  if (fastingType === "muslim_fasting") return "Muslim Fasting";
  return "Not Fasting";
};
