import express from "express";
import PlayHistoryController from "../controllers/play-history.controller.js";
import PlayHistoryService from "../services/play-history.service.js";
import playHistoryRepository from "../repositories/play-history.repository.js";
import trackRepository from "../repositories/track.repository.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

const playHistoryService = new PlayHistoryService(
  playHistoryRepository,
  trackRepository,
);

const playHistoryController = new PlayHistoryController(playHistoryService);

// All routes require authentication
router.use(authMiddleware.requireAuth);

router.get("/me/history", playHistoryController.getHistory);
router.delete("/me/history", playHistoryController.clearHistory);
router.get("/me/recently-played", playHistoryController.getRecentlyPlayed);

export default router;
