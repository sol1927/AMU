import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clearExpiredResetTokens } from "./utils/cleanup.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminProfileRoutes from "./routes/adminProfile.routes.js";
import campusRoutes from "./routes/campus.route.js";
import stationScanRoutes from "./routes/stationScan.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", adminProfileRoutes);
app.use("/api/campus", campusRoutes);
app.use("/api/meal", stationScanRoutes);

setInterval(clearExpiredResetTokens, 3600000);
clearExpiredResetTokens();

export default app;
