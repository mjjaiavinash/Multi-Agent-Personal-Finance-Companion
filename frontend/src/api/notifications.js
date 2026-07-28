import api from "./axiosInstance";

/** GET /api/v1/notifications */
export const getNotifications = (limit = 20) =>
  api.get("/notifications", { params: { limit } });

/** GET /api/v1/notifications/unread-count */
export const getUnreadCount = () =>
  api.get("/notifications/unread-count");

/** PATCH /api/v1/notifications/:id/read */
export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`);

/** PATCH /api/v1/notifications/read-all */
export const markAllNotificationsRead = () =>
  api.patch("/notifications/read-all");
