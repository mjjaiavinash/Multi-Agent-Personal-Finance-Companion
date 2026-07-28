/**
 * Accessible Loader / Spinner component.
 *
 * Accessibility:
 *  - role="status" announces the loading state to screen readers
 *  - aria-label provides a meaningful description of the loading activity
 *  - The visible spinner is aria-hidden to avoid duplicate announcements
 *
 * @param {boolean} fullScreen - If true, renders as a full-screen overlay
 * @param {string}  message    - Optional message shown below the spinner
 */
export default function Loader({ fullScreen = false, message = "Loading..." }) {
  const spinner = (
    <div role="status" aria-label={message} className="flex flex-col items-center gap-3">
      {/* Purely decorative — screen readers use aria-label from the parent instead */}
      <div
        aria-hidden="true"
        className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"
      />
      <p className="text-sm text-slate-400" aria-hidden="true">
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-surface-900 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-16">{spinner}</div>;
}
