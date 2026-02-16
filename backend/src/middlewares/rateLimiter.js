import rateLimit from "express-rate-limit";

// Helper to format milliseconds to minutes only
const formatMs = (ms) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.ceil(totalSeconds / 60); // round up to full minute
  return `${minutes} minute(s)`;
};

// OTP request limiter
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many requests. Try again after ${retryAfter}.`,
    });
  },
});

// OTP verify limiter (anti brute-force)
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many attempts. Try again after ${retryAfter}.`,
    });
  },
});

// Password reset request limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many requests. Try again after ${retryAfter}.`,
    });
  },
});

// 🔐 LOGIN limiter (anti brute-force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 115,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many attempts. Try again after ${retryAfter}.`,
    });
  },
});

// 🔐 NEW DEVICE OTP request limiter
export const deviceOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests in 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many device OTP requests. Try again after ${retryAfter}.`,
    });
  },
});
