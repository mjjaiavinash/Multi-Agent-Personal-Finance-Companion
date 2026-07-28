import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as svc from "../services/notificationService.js";

/** GET /api/v1/notifications */
export const getNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit || "20");
  const result = await svc.getNotifications(req.user._id, limit);
  ApiResponse.ok(res, { notifications: result }, "Notifications retrieved.");
});

/** GET /api/v1/notifications/unread-count */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await svc.getUnreadCount(req.user._id);
  ApiResponse.ok(res, { count }, "Unread count retrieved.");
});

/** PATCH /api/v1/notifications/:id/read */
export const markAsRead = asyncHandler(async (req, res) => {
  const result = await svc.markAsRead(req.user._id, req.params.id);
  ApiResponse.ok(res, { notification: result }, "Notification marked as read.");
});

/** PATCH /api/v1/notifications/read-all */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await svc.markAllAsRead(req.user._id);
  ApiResponse.ok(res, {}, "All notifications marked as read.");
});
