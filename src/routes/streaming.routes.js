import express from "express";
import StreamingController from "../controllers/streaming.controller.js";
import StreamingService from "../services/streaming.service.js";
import trackRepository from "../repositories/track.repository.js";
import playHistoryRepository from "../repositories/play-history.repository.js";
import PlayHistoryService from "../services/play-history.service.js";
import PlayHistoryController from "../controllers/play-history.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Streaming handles stream and download links
const streamingService = new StreamingService(trackRepository);
const streamingController = new StreamingController(streamingService);

// Play History handles recording play events
const playHistoryService = new PlayHistoryService(
  playHistoryRepository,
  trackRepository,
);
const playHistoryController = new PlayHistoryController(playHistoryService);

// All routes require authentication
router.use(authMiddleware.requireAuth);

router.get("/:track_id/stream-url", streamingController.getStreamUrl);
router.get("/:track_id/stream", streamingController.streamRedirect);
router.post("/:track_id/play", playHistoryController.recordPlay);
router.get("/:track_id/download", streamingController.download);

export default router;
