import express from "express";
import playHistoryController from "../controllers/play-history.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.requireAuth);

router.get("/me/history", playHistoryController.getHistory);
router.delete("/me/history", playHistoryController.clearHistory);
router.get("/me/recently-played", playHistoryController.getRecentlyPlayed);

export default router;
