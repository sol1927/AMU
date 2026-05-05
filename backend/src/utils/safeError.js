export const logInternalError = (context, error) => {
  if (error?.code === "ER_NO_SUCH_TABLE") {
    return;
  }

  const name = error?.name || "Error";
  const message = error?.logMessage || error?.message || "Unexpected error";
  const code =
    error && typeof error === "object" && "code" in error ? error.code : null;
  const formattedMessage = error?.omitCodeInLog
    ? `[${context}] ${message}`
    : code
      ? `[${context}] ${message} (${code})`
      : `[${context}] ${message}`;

  if (code === "EMAIL_NETWORK_ERROR" || code === "EMAIL_DELIVERY_FAILED") {
    console.warn(formattedMessage);
    return;
  }

  if (error?.omitNameInLog) {
    console.error(formattedMessage);
    return;
  }

  console.error(formattedMessage, { name });
};

export const sendServerError = (
  res,
  message = "Something went wrong. Please try again later.",
) => res.status(500).json({ message });

export const sendError = (res, status, message) =>
  res.status(status).json({ message });

export const handleNotFound = (req, res) =>
  sendError(res, 404, "We could not find what you requested.");

export const handleUnhandledError = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.type === "entity.too.large" || error?.status === 413) {
    return res.status(413).json({
      message: "The selected image is too large. Please choose a smaller one.",
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      message: "Invalid request data. Please try again.",
    });
  }

  logInternalError(`${req.method} ${req.originalUrl}`, error);
  return sendServerError(res);
};
