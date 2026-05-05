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

export const getSessionCookieOptions = (sameSite = getCookieSameSite()) =>
  getCookieOptions(undefined, sameSite);

export const formatMinutes = (ms) => {
  const minutes = Math.ceil(ms / (60 * 1000));
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
};
