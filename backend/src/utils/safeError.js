export const logInternalError = (context, error) => {
  const safePayload = {
    name: error?.name || "Error",
  };

  if (error && typeof error === "object" && "code" in error) {
    safePayload.code = error.code;
  }

  console.error(`[${context}]`, safePayload);
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

  logInternalError(`${req.method} ${req.originalUrl}`, error);
  return sendServerError(res);
};
