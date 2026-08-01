export const useSecureCookies = () => process.env.COOKIE_SECURE === "true";

export const getCookieSameSite = () =>
  useSecureCookies() ? "none" : "lax";

export const getCookieOptions = (
  duration,
  sameSite = getCookieSameSite(),
) => ({
  httpOnly: true,
  sameSite,
  secure: useSecureCookies(),
  ...(duration === undefined ? {} : { maxAge: duration }),
  priority: "high",
});

// Session cookie — expires when browser closes (used by admin, campus, cafe manager)
export const getSessionCookieOptions = (sameSite = getCookieSameSite()) =>
  getCookieOptions(undefined, sameSite);

// Persistent cookie — survives browser close and device restart for 30 days (used by cafe role)
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const getPersistentCookieOptions = (sameSite = getCookieSameSite()) =>
  getCookieOptions(THIRTY_DAYS_MS, sameSite);

export const formatMinutes = (ms) => {
  const minutes = Math.ceil(ms / (60 * 1000));
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
};
