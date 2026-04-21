export const formatFullName = (name) => {
  if (!name) return name;

  const normalizedName = name.trim();

  if (normalizedName.toUpperCase() === "N/A") {
    return "N/A";
  }

  return (
    normalizedName
      .toLowerCase()
      .replace(/(^|[\s-])\S/g, (match) => match.toUpperCase())
  );
};
