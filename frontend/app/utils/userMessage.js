const TECHNICAL_MESSAGE_PATTERNS = [
  /mongodb/i,
  /mongoose/i,
  /cast to/i,
  /validation failed/i,
  /duplicate key/i,
  /cloudinary/i,
  /smtp/i,
  /jwt/i,
  /undefined/i,
  /cannot read/i,
  /stack/i,
  /econn/i,
  /networkerror/i,
  /failed to fetch/i,
  /^server error$/i,
  /^invalid request$/i,
  /^device mismatch$/i,
  /^request failed$/i,
  /^reset failed$/i,
  /^delete failed$/i,
  /^update failed$/i,
  /^upload failed$/i,
  /^photo upload failed$/i,
  /^profile update failed$/i,
  /^password change failed$/i,
  /^failed to /i,
];

export const getFriendlyMessage = (
  message,
  fallback = "Something went wrong. Please try again.",
) => {
  if (typeof message !== "string") return fallback;

  const normalizedMessage = message.trim();
  if (!normalizedMessage) return fallback;

  const looksTechnical = TECHNICAL_MESSAGE_PATTERNS.some((pattern) =>
    pattern.test(normalizedMessage),
  );

  return looksTechnical ? fallback : normalizedMessage;
};

export const getApiMessage = (
  payload,
  fallback = "Something went wrong. Please try again.",
) => getFriendlyMessage(payload?.message, fallback);

export const getRequestErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  if (error?.name === "AbortError") {
    return "The server is taking too long to respond. Please try again in a moment.";
  }

  return fallback;
};

export const getErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  if (error?.name === "AbortError") {
    return getRequestErrorMessage(error, fallback);
  }

  return getFriendlyMessage(error?.message, fallback);
};
