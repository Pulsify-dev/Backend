import { Router } from "express";
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import socialRoutes from "./social.routes.js";
import trackRoutes from "./track.routes.js";
import streamingRoutes from "./streaming.routes.js";
import playHistoryRoutes from "./play-history.routes.js";
import engagementRoutes from "./engagement.routes.js";

const router = Router();

// Module 1: Auth
router.use("/auth", authRoutes);

// Module 2 & 3: Profiles & Social (both under /users)
router.use("/users", profileRoutes);
router.use("/users", socialRoutes);

// Module 5: Play History (under /users/me/...)
router.use("/users", playHistoryRoutes);

// Module 4: Tracks & Artists (trackRoutes handles /tracks and /artists internally)
router.use("/", trackRoutes);

// Module 5: Streaming (under /tracks/:track_id/...)
router.use("/tracks", streamingRoutes);

// Module 6: Engagement & Social Interactions (Likes, Reposts, Comments)
router.use("/", engagementRoutes);

export default router;
