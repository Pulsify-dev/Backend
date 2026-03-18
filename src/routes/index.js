import { Router } from "express";
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";

const router = Router();

//all feature routes here
router.use("/auth", authRoutes);
router.use("/users", profileRoutes);

export default router;
