import express from "express";
import mongoose from "mongoose";
import errorMiddleware from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use("/v1", routes);

app.use(errorMiddleware.notFound);

app.use(errorMiddleware.errorHandler);

export default app;
