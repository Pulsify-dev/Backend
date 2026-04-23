import { Router } from "express";
import subscriptionController from "../controllers/subscription.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.get("/subscriptions/me", authMiddleware.requireAuth, subscriptionController.getMySubscription);
router.post("/subscriptions/checkout", authMiddleware.requireAuth, subscriptionController.createCheckout);
router.post("/subscriptions/cancel", authMiddleware.requireAuth, subscriptionController.cancelSubscription);
router.post("/subscriptions/webhook", subscriptionController.handleWebhook);

router.get("/plans", subscriptionController.getPlans);
router.get("/users/me/usage", authMiddleware.requireAuth, subscriptionController.getUsage);

export default router;
