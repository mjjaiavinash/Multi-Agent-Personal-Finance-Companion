import { AlertCircle, X } from "lucide-react";

/**
 * Reusable error banner.
 * Replaces the inline error <div> that was copy-pasted across every page.
 *
 * @param {string}   message  - Error text to display
 * @param {Function} onDismiss - Optional dismiss handler
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm"
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:text-rose-300 transition-colors"
          aria-label="Dismiss error"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
