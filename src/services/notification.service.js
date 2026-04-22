import NotificationRepository from "../repositories/notification.repository.js";
import UserRepository from "../repositories/user.repository.js";
import FirebaseService from "./firebase.service.js";
import { emitNotification } from "../sockets/notification.socket.js";
import { AppError } from "../utils/errors.utils.js";
class NotificationService {
  async getNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      NotificationRepository.findPaginatedByUserId(userId, skip, limit),
      NotificationRepository.countTotalByUserId(userId),
    ]);

    return {
      data: notifications,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId) {
    const count = await NotificationRepository.countUnread(userId);
    return { unread_count: count };
  }

  async markAllAsRead(userId) {
    await NotificationRepository.markAllAsRead(userId);
    return { message: "All notifications marked as read" };
  }

  async markAsRead(notificationId, userId) {
    const notification = await NotificationRepository.markAsRead(
      notificationId,
      userId,
    );
    if (!notification) {
      throw new AppError("Notification not found or unauthorized", 404);
    }
    return notification;
  }

  async addPushToken(userId, token) {
    const user = await UserRepository.addDeviceToken(userId, token);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return { message: "Push token registered successfully" };
  }

  async createAndDeliverNotification(data, ioInstance) {
    //  Don't notify yourself
    if (data.actor_id.toString() === data.recipient_id.toString()) {
      return null;
    }

    const notification = await NotificationRepository.create(data);

    if (ioInstance) {
      emitNotification(ioInstance, data.recipient_id, notification);
    }

    const recipient = await UserRepository.findById(data.recipient_id);

    if (
      recipient &&
      recipient.device_tokens &&
      recipient.device_tokens.length > 0
    ) {
      const payload = {
        title: "New Activity on Pulsify",
        body: `Someone interacted with your ${data.entity_type.toLowerCase()}`,
        data: {
          entity_id: data.entity_id.toString(),
          action_type: data.action_type,
        },
      };
      FirebaseService.sendPushNotification(recipient.device_tokens, payload);
    }

    return notification;
  }
}

export default new NotificationService();
