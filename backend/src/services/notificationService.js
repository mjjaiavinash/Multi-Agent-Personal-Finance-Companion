import Notification from "../models/Notification.js";

/**
 * Creates and persists a notification for a user.
 */
export const createNotification = async (userId, data) => {
  const { type, title, message, severity = "info", metadata = {} } = data;

  // Deduplicate identical pending notifications created in the last 1 minute
  const recentCutoff = new Date(Date.now() - 60 * 1000);
  const existing = await Notification.findOne({
    user: userId,
    type,
    title,
    createdAt: { $gte: recentCutoff },
  });

  if (existing) {
    return existing.toObject();
  }

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    severity,
    read: false,
    metadata,
  });

  return notification.toObject();
};

/**
 * Returns notifications list for a user.
 */
export const getNotifications = async (userId, limit = 20) => {
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return notifications;
};

/**
 * Returns unread notifications count for a user.
 */
export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ user: userId, read: false });
  return count;
};

/**
 * Marks a single notification as read.
 */
export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  ).lean();

  return notification;
};

/**
 * Marks all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  return { success: true };
};
