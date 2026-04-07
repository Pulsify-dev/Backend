import { Router } from 'express';
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import streamingRoutes from "./streaming.routes.js";
import playHistoryRoutes from "./play-history.routes.js";
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import socialRoutes from "./social.routes.js";
import trackRoutes from "./track.routes.js";

const router = Router();

//all feature routes here
router.use("/auth", authRoutes);
router.use("/users", profileRoutes);
router.use("/users", playHistoryRoutes);
router.use("/tracks", streamingRoutes);
export default router;
router.use("/", trackRoutes);
router.use("/users", profileRoutes);
router.use("/users", socialRoutes);

export default router;
