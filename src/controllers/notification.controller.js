import NotificationService from "../services/notification.service.js";
import { AppError } from "../utils/errors.utils.js";
class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.pagination || req.query;

      const result = await NotificationService.getNotifications(
        userId,
        Number(page),
        Number(limit),
      );

      res.status(200).json({
        status: "success",
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.user_id;
      const countData = await NotificationService.getUnreadCount(userId);
      res.status(200).json({ status: "success", data: countData });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.user_id;
      const result = await NotificationService.markAllAsRead(userId);
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      const notification = await NotificationService.markAsRead(id, userId);
      res.status(200).json({ status: "success", data: notification });
    } catch (error) {
      next(error);
    }
  }

  async registerPushToken(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { token } = req.body;

      if (!token) throw new AppError("Push token is required", 400);

      const result = await NotificationService.addPushToken(userId, token);
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
