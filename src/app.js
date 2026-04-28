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
// Limit each client to 1000 API requests per 5-minute window.
// Shorter window = less punishment on lockout (5 min vs 15 min).
// Higher limit  = IP collisions are far less likely to trigger a false ban.

/**
 * Extract the real client IP from proxy headers.
 * Checks (in order): X-Forwarded-For, X-Real-IP, CF-Connecting-IP, then req.ip.
 * Normalises IPv4-mapped IPv6 addresses (e.g. "::ffff:1.2.3.4" → "1.2.3.4").
 */
function getRealIp(req) {
  let ip;

  // X-Forwarded-For may contain a comma-separated list: "client, proxy1, proxy2"
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const firstIp = xff.split(",")[0].trim();
    if (firstIp) ip = firstIp;
  }

  // Some proxies set X-Real-IP directly
  if (!ip && req.headers["x-real-ip"]) ip = req.headers["x-real-ip"].trim();

  // Cloudflare sets CF-Connecting-IP
  if (!ip && req.headers["cf-connecting-ip"]) ip = req.headers["cf-connecting-ip"].trim();

  // Fallback to Express's req.ip (uses trust proxy setting)
  if (!ip) ip = req.ip;

  // Strip IPv4-mapped IPv6 prefix so "::ffff:1.2.3.4" becomes "1.2.3.4"
  if (ip && ip.startsWith("::ffff:")) ip = ip.slice(7);

  return ip;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 500,                  // 500 requests per window
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use the real client IP so each user gets their own rate-limit bucket
  keyGenerator: (req) => {
    const key = getRealIp(req);
    // Expose the rate-limit key in a response header so devs can debug collisions
    req.__rateLimitKey = key;
    return key;
  },
  // Attach a header so the frontend team can see which IP bucket they landed in
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many requests from this IP, please try again after 15 minutes",
      _debug: {
        rate_limit_key: req.__rateLimitKey || getRealIp(req),
        hint: "If this key doesn't match your real IP, your proxy is masking it. Contact backend team.",
      },
    });
  },
  // We handle IP extraction ourselves — disable the IPv6 key-generator validation
  validate: { keyGeneratorIpFallback: false },
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
