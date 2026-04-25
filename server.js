import "./src/config/index.js";

import http from "http";
import connectDB from "./src/config/db.js";

import app from "./src/app.js"; // ← Import configured app
import { initializeSocketServer } from "./src/sockets/index.js";
import { startTrendingCron, recalculateTrendingScores } from "./src/jobs/trending-score.job.js";
import {
  startSubscriptionExpiryCron,
  syncExpiredSubscriptionsNow,
} from "./src/jobs/quota-reset.job.js";
import "./src/jobs/audio.worker.js";

connectDB();

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
const io = initializeSocketServer(httpServer);

app.set("io", io);
httpServer.listen(PORT, () => {
  console.log(`🚀 Pulsify Backend is running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server");

  // Start trending score cron (runs every hour)
  startTrendingCron();
  startSubscriptionExpiryCron();

  // Run an initial score calculation on startup
  recalculateTrendingScores().catch((err) =>
    console.error("[Trending Job] Initial run failed:", err)
  );

  syncExpiredSubscriptionsNow().catch((err) =>
    console.error("[Subscription Expiry Job] Initial run failed:", err)
  );
});
