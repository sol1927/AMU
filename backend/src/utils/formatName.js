export const formatFullName = (name) => {
  if (!name) return name;

  return (
    name
      .toLowerCase()
      .trim()
      // Find characters after a start of string, space, or hyphen
      .replace(/(^|[\s-])\S/g, (match) => match.toUpperCase())
  );
};
