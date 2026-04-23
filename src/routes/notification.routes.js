import express from "express";
import NotificationController from "../controllers/notification.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import paginationMiddleware from "../middleware/pagination.middleware.js";

const router = express.Router();

router.use(authMiddleware.requireAuth);

router.get(
  "/",
  paginationMiddleware.paginate,
  NotificationController.getNotifications,
);

router.get("/unread-count", NotificationController.getUnreadCount);
router.put("/read-all", NotificationController.markAllAsRead);
router.put("/:id/read", NotificationController.markAsRead);
router.post("/push-token", NotificationController.registerPushToken);

export default router;
