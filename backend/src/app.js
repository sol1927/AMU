import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.set("trust proxy", 1); // ✅ ADD THIS LINE

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

export default app;
