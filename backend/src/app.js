import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { runScheduledCleanup } from "./utils/cleanup.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminProfileRoutes from "./routes/adminProfile.routes.js";
import campusRoutes from "./routes/campus.route.js";
import stationScanRoutes from "./routes/stationScan.routes.js";
import cafeRoutes from "./routes/cafe.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { handleNotFound, handleUnhandledError } from "./utils/safeError.js";
import { requireDatabaseConnection } from "./middlewares/dbReady.middleware.js";

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );

  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

app.use((req, res, next) => {
  if (!req.path.startsWith("/api") || !MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const referer = req.get("referer");
  const allowedOrigin = FRONTEND_URL.replace(/\/$/, "");

  if (origin) {
    if (origin.replace(/\/$/, "") !== allowedOrigin) {
      return res.status(403).json({ message: "Request origin not allowed." });
    }
    return next();
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin.replace(/\/$/, "");
      if (refererOrigin !== allowedOrigin) {
        return res.status(403).json({ message: "Request origin not allowed." });
      }
    } catch {
      return res.status(403).json({ message: "Request origin not allowed." });
    }
  }

  return next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", requireDatabaseConnection);

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", adminProfileRoutes);
app.use("/api/campus", campusRoutes);
app.use("/api/meal", stationScanRoutes);
app.use("/api/cafe", cafeRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/reports", reportRoutes);

app.use(handleNotFound);
app.use(handleUnhandledError);

setInterval(runScheduledCleanup, 60000);
runScheduledCleanup();

export default app;
