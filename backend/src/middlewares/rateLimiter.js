import rateLimit from "express-rate-limit";

const formatMs = (ms) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} minute(s)`;
};

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
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

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many attempts. Try again after ${retryAfter}.`,
    });
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
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

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many attempts. Try again after ${retryAfter}.`,
    });
  },
});

export const deviceOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = formatMs(req.rateLimit.resetTime - Date.now());
    return res.status(429).json({
      message: `Too many device OTP requests. Try again after ${retryAfter}.`,
    });
  },
});
