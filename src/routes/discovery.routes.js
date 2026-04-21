import { Router } from "express";
import discoveryController from "../controllers/discovery.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

// ── Module 8: Feed & Discovery ───────────────────────────────────────────────

// GET /search — Global Search via Meilisearch
router.get(
    "/search",
    discoveryController.globalSearch
);

// GET /trending — Trending tracks by engagement velocity (no auth required)
router.get(
    "/trending",
    discoveryController.getTrending
);

// GET /charts — Top ranked tracks chart (no auth required)
router.get(
    "/charts",
    discoveryController.getCharts
);

// GET /feed  — personal feed (auth required)
router.get(
    "/feed",
    authMiddleware.requireAuth,
    discoveryController.getPersonalFeed
);

// GET /users/:user_id/feed  — public profile feed (no auth required)
router.get(
    "/users/:user_id/feed",
    discoveryController.getUserProfileFeed
);

// GET /resolve  — URL to resource resolution
router.get(
    "/resolve",
    discoveryController.resolveResource
);

export default router;