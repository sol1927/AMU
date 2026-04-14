export const formatFullName = (name) => {
  if (!name) return name;

  return (
    name
      .toLowerCase()
      .trim()
      .replace(/(^|[\s-])\S/g, (match) => match.toUpperCase())
  );
};
