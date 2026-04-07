import express from "express";
import streamingController from "../controllers/streaming.controller.js";
import playHistoryController from "../controllers/play-history.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.requireAuth);

// Streaming endpoints
router.get("/:track_id/stream-url", streamingController.getStreamUrl);
router.get("/:track_id/stream", streamingController.streamRedirect);
router.get("/:track_id/download", streamingController.download);

// Play event (mounted under /tracks, so full path is /v1/tracks/:track_id/play)
router.post("/:track_id/play", playHistoryController.recordPlay);

export default router;
