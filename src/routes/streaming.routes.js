import express from "express";
import streamingController from "../controllers/streaming.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.requireAuth);

// ════════════════════════════════════════════════════
//  STREAMING ENDPOINTS
// ════════════════════════════════════════════════════
router.get("/tracks/:track_id/stream-url", streamingController.getStreamUrl);
router.get("/tracks/:track_id/stream", streamingController.streamRedirect);
router.get("/tracks/:track_id/download", streamingController.download);

// ════════════════════════════════════════════════════
//  PLAY HISTORY ENDPOINTS
// ════════════════════════════════════════════════════
router.post("/tracks/:track_id/play", streamingController.recordPlay);

router.get("/users/me/history", streamingController.getHistory);
router.delete("/users/me/history", streamingController.clearHistory);
router.get("/users/me/recently-played", streamingController.getRecentlyPlayed);

export default router;
