import React, { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, X, AlertTriangle, Info, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

const SEVERITY_CONFIG = {
  info:    { icon: Info,          color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   dot: "bg-blue-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  dot: "bg-amber-400" },
  error:   { icon: AlertCircle,   color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/20",   dot: "bg-rose-400" },
  success: { icon: CheckCircle2,  color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20",dot: "bg-emerald-400" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-surface-700 transition-all"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-extrabold bg-rose-500 text-white rounded-full px-1 shadow-lg animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-surface-800/95 border border-surface-700/60 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary-400" />
              <span className="text-sm font-bold text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-surface-700/30">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell size={32} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1 opacity-60">Events will appear here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                const SevIcon = cfg.icon;
                return (
                  <div
                    key={n._id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-surface-700/40 ${
                      !n.read ? "bg-surface-700/20" : ""
                    }`}
                    onClick={() => !n.read && markAsRead(n._id)}
                  >
                    {/* Severity Icon */}
                    <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg} ${cfg.border} border flex-shrink-0`}>
                      <SevIcon size={14} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-bold truncate ${n.read ? "text-slate-400" : "text-slate-100"}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                        <Clock size={10} />
                        <span>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
