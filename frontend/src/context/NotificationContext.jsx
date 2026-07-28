import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";

const NotificationContext = createContext(null);

const SEVERITY_ICONS = {
  info:    "ℹ️",
  warning: "⚠️",
  error:   "🚨",
  success: "✅",
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [toasts, setToasts]               = useState([]);
  const prevUnreadRef  = useRef(0);
  const pollRef        = useRef(null);
  const toastTimersRef = useRef(new Map()); // track auto-dismiss timers

  // Fetch notifications list & unread count
  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      const [notiRes, countRes] = await Promise.all([
        getNotifications(20),
        getUnreadCount(),
      ]);

      const newNotifications = notiRes.data?.notifications || [];
      const newCount = countRes.data?.count || 0;

      setNotifications(newNotifications);
      setUnreadCount(newCount);

      // Only show toasts for brand-new unread notifications on polling
      if (silent && newCount > prevUnreadRef.current) {
        const fresh = newNotifications
          .filter((n) => !n.read)
          .slice(0, newCount - prevUnreadRef.current);

        fresh.forEach((n) => {
          addToast({
            id: n._id,
            title: n.title,
            message: n.message,
            severity: n.severity,
          });
        });
      }

      prevUnreadRef.current = newCount;
    } catch {
      // Fail silently — user might not be logged in
    }
  }, []);

  // Add a toast popup
  const addToast = useCallback(({ id, title, message, severity = "info" }) => {
    const toastId = id || `toast-${Date.now()}`;
    setToasts((prev) => {
      // Deduplicate
      if (prev.find((t) => t.id === toastId)) return prev;
      return [...prev, { id: toastId, title, message, severity }];
    });

    // Auto-dismiss after 5s — track timer so it can be cleared on unmount
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
      toastTimersRef.current.delete(toastId);
    }, 5000);
    toastTimersRef.current.set(toastId, timer);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleMarkRead = useCallback(async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
    } catch {
      // ignore
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch {
      // ignore
    }
  }, []);

  // Initial load + polling every 30s (paused when tab is hidden)
  useEffect(() => {
    fetchNotifications(false);

    pollRef.current = setInterval(() => {
      if (!document.hidden) fetchNotifications(true);
    }, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      // Clear all pending toast dismiss timers
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        dismissToast,
        fetchNotifications,
        markAsRead: handleMarkRead,
        markAllAsRead: handleMarkAllRead,
        SEVERITY_ICONS,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
