import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clearExpiredResetTokens } from "./utils/cleanup.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminProfileRoutes from "./routes/adminProfile.routes.js";

const app = express();

app.set("trust proxy", 1);

// Parse JSON & cookies
app.use(express.json());
app.use(cookieParser());

// Enable CORS for frontend
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

// 🔒 Prevent browser caching for all routes
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", adminProfileRoutes);

// 🔄 Schedule expired reset token cleanup
setInterval(clearExpiredResetTokens, 3600000); // every hour
clearExpiredResetTokens(); // run once immediately

export default app;
