import "./src/config/index.js";

import http from "http";
import connectDB from "./src/config/db.js";

import app from "./src/app.js";  // ← Import configured app
import { initializeSocketServer } from "./src/sockets/index.js";
import { startTrendingCron, recalculateTrendingScores } from "./src/jobs/trending-score.job.js";

connectDB();

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
initializeSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Pulsify Backend is running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server");

  // Start trending score cron (runs every hour)
  startTrendingCron();

  // Run an initial score calculation on startup
  recalculateTrendingScores().catch((err) =>
    console.error("[Trending Job] Initial run failed:", err)
  );
});
