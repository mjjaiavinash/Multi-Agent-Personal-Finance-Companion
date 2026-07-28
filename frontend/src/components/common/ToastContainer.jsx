import React from "react";
import { X, AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

const TOAST_CONFIG = {
  info:    { icon: Info,          border: "border-l-blue-400",   bg: "bg-blue-500/10",    text: "text-blue-400" },
  warning: { icon: AlertTriangle, border: "border-l-amber-400",  bg: "bg-amber-500/10",   text: "text-amber-400" },
  error:   { icon: AlertCircle,   border: "border-l-rose-400",   bg: "bg-rose-500/10",    text: "text-rose-400" },
  success: { icon: CheckCircle2,  border: "border-l-emerald-400",bg: "bg-emerald-500/10", text: "text-emerald-400" },
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const cfg = TOAST_CONFIG[toast.severity] || TOAST_CONFIG.info;
        const Icon = cfg.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 w-80 max-w-sm p-4 rounded-2xl border border-surface-700/60 border-l-4 ${cfg.border} ${cfg.bg} bg-surface-800/95 backdrop-blur-xl shadow-2xl animate-slideInRight`}
            style={{ animation: "slideInRight 0.3s ease-out" }}
          >
            <Icon size={18} className={`${cfg.text} flex-shrink-0 mt-0.5`} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100 leading-tight">{toast.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-500 hover:text-slate-200 flex-shrink-0 p-0.5 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
