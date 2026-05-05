const TECHNICAL_MESSAGE_PATTERNS = [
  /mysql/i,
  /sql/i,
  /cast to/i,
  /validation failed/i,
  /duplicate key/i,
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

const NO_CONNECTION_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /load failed/i,
  /internet connection/i,
  /offline/i,
  /no connection/i,
];

const EMAIL_DELIVERY_PATTERNS = [
  /email delivery failed/i,
  /could not send the email right now/i,
];

export const getFriendlyMessage = (
  message,
  fallback = "Something went wrong. Please try again.",
) => {
  if (typeof message !== "string") return fallback;

  const normalizedMessage = message.trim();
  if (!normalizedMessage) return fallback;

  if (NO_CONNECTION_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return "No internet connection. Please check your network and try again.";
  }

  if (
    EMAIL_DELIVERY_PATTERNS.some((pattern) => pattern.test(normalizedMessage))
  ) {
    return "We could not send the email right now. Please try again in a moment.";
  }

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

  if (
    typeof navigator !== "undefined" &&
    "onLine" in navigator &&
    navigator.onLine === false
  ) {
    return "No internet connection. Please check your network and try again.";
  }

  if (error instanceof TypeError) {
    return "No internet connection. Please check your network and try again.";
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
