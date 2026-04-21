import express from "express";
import streamingController from "../controllers/streaming.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication individually to prevent middleware leaks on the "/" mounted path
// ════════════════════════════════════════════════════
//  STREAMING ENDPOINTS
// ════════════════════════════════════════════════════
router.get("/tracks/:track_id/stream-url", authMiddleware.requireAuth, streamingController.getStreamUrl);
router.get("/tracks/:track_id/stream", authMiddleware.requireAuth, streamingController.streamRedirect);
router.get("/tracks/:track_id/download", authMiddleware.requireAuth, streamingController.download);

// ════════════════════════════════════════════════════
//  PLAY HISTORY ENDPOINTS
// ════════════════════════════════════════════════════
router.post("/tracks/:track_id/play", authMiddleware.requireAuth, streamingController.recordPlay);

router.get("/users/me/history", authMiddleware.requireAuth, streamingController.getHistory);
router.delete("/users/me/history", authMiddleware.requireAuth, streamingController.clearHistory);
router.get("/users/me/recently-played", authMiddleware.requireAuth, streamingController.getRecentlyPlayed);

export default router;
