import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import errorMiddleware from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
const app = express();

// ── Security Headers ────────────────────────────────────────
// Set global security headers to protect against common web vulnerabilities
app.use(helmet());

// ── CORS Configuration ──────────────────────────────────────
// This tells the browser that requests from these specific origins are safe.
app.use(cors({
  origin: [
    "https://pulsify.page",
    "https://www.pulsify.page",
    "http://localhost:5173",  // Vite default port
    "http://127.0.0.1:5173"
  ],
  credentials: true // Required so the frontend can send cookies/Authorization headers
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Data Sanitization ───────────────────────────────────────
// Note: xss-clean was removed because it is incompatible with Express 5's req.query getter.
// Ensure frontend frameworks handle XSS protection, or use dompurify on specific fields if needed.

// ── DevOps health probes ────────────────────────────────────

app.get("/v1", (req, res) => {
  console.log("Pulsify API is Live!");
  res.status(200).send("Pulsify API is Live!")});

// Deep health check – pokes the DB to verify full-stack readiness
app.get("/v1/health", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: "unhealthy", error: err.message });
  }
});

// ── Rate Limiting ───────────────────────────────────────────
// Limit each IP to 500 API requests per 15-minute window
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 500, 
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/v1", apiLimiter, routes);

app.use(errorMiddleware.notFound);

app.use(errorMiddleware.errorHandler);

export default app;
