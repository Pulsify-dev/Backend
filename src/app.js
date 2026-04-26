import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import errorMiddleware from "./middleware/error.middleware.js";
import redisClient from "./config/redis.js";
import routes from "./routes/index.js";
const app = express();

// Trust the first proxy (e.g. Nginx, Heroku, Cloudflare) to get real user IP
app.set("trust proxy", 1);

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

/**
 * Extract the real client IP from proxy headers.
 * Checks (in order): X-Forwarded-For, X-Real-IP, CF-Connecting-IP, then req.ip.
 */
function getRealIp(req) {
  // X-Forwarded-For may contain a comma-separated list: "client, proxy1, proxy2"
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const firstIp = xff.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Some proxies set X-Real-IP directly
  if (req.headers["x-real-ip"]) return req.headers["x-real-ip"].trim();

  // Cloudflare sets CF-Connecting-IP
  if (req.headers["cf-connecting-ip"]) return req.headers["cf-connecting-ip"].trim();

  // Fallback to Express's req.ip (uses trust proxy setting)
  return req.ip;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 500, 
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use the real client IP instead of the default req.ip
  keyGenerator: (req) => {
    const ip = getRealIp(req);
    // Debug log — remove once confirmed working
    console.log(`[RateLimit] IP: ${ip} | XFF: ${req.headers["x-forwarded-for"] || "none"} | req.ip: ${req.ip}`);
    return ip;
  },
  // Use Redis store if Redis is available, otherwise falls back to memory store
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

app.use("/v1", apiLimiter, routes);

app.use(errorMiddleware.notFound);

app.use(errorMiddleware.errorHandler);

export default app;
