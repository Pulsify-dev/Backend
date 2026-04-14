import { Router } from "express";
import reportController from "../controllers/report.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authMiddleware.requireAuth, reportController.createReport);

export default router;
