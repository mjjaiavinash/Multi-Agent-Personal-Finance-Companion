import React from "react";
import { Bell, AlertTriangle, Info, AlertCircle, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

const SEVERITY_CONFIG = {
  info:    { icon: Info,          color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  error:   { icon: AlertCircle,   color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  success: { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
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

export default function NotificationWidget() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const recent = notifications.slice(0, 5);

  return (
    <div className="bg-surface-800/80 border border-surface-700/60 rounded-3xl shadow-xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary-400" />
          <h3 className="text-base font-bold text-slate-100">Smart Alerts</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/20">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* Notification Items */}
      <div className="divide-y divide-surface-700/30">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 px-5">
            <Bell size={28} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">No alerts yet</p>
            <p className="text-xs mt-1 opacity-60">Smart alerts will appear here</p>
          </div>
        ) : (
          recent.map((n) => {
            const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div
                key={n._id}
                className={`flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-surface-700/30 transition-colors ${
                  !n.read ? "bg-surface-700/10" : ""
                }`}
                onClick={() => !n.read && markAsRead(n._id)}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg} ${cfg.border} border flex-shrink-0`}>
                  <Icon size={13} className={cfg.color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-semibold truncate ${n.read ? "text-slate-400" : "text-slate-100"}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.message}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
                    <Clock size={9} />
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
