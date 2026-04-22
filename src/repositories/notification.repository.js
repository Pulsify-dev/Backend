import Notification from "../models/notification.model.js";

class NotificationRepository {
  async create(data) {
    const notification = new Notification(data);
    return await notification.save();
  }

  async findPaginatedByUserId(userId, skip, limit) {
    return await Notification.find({ recipient_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor_id", "display_name avatar_url")
      .lean();
  }

  async countTotalByUserId(userId) {
    return await Notification.countDocuments({ recipient_id: userId });
  }

  async countUnread(userId) {
    return await Notification.countDocuments({
      recipient_id: userId,
      is_read: false,
    });
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient_id: userId, is_read: false },
      { $set: { is_read: true } },
    );
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, recipient_id: userId },
      { $set: { is_read: true } },
      { new: true },
    );
  }
}

export default new NotificationRepository();
