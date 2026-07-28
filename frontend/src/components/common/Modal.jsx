import { X } from "lucide-react";
import { useEffect, useRef, useId } from "react";

/**
 * Accessible Modal component.
 *
 * Accessibility:
 *  - role="dialog" + aria-modal="true" signals a modal context to screen readers
 *  - aria-labelledby links the dialog to its visible title
 *  - Focus is moved into the modal on open and restored on close (focus trap)
 *  - Escape key closes the modal (keydown listener on the document)
 *  - Backdrop click closes the modal via a transparent overlay div
 */
export default function Modal({ isOpen, onClose, title, children }) {
  const titleId      = useId();
  const closeBtnRef  = useRef(null);

  // Move focus to the close button when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Defer to allow the DOM to paint before focusing
      const timer = setTimeout(() => closeBtnRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // Prevent scroll on the body behind the modal
      aria-hidden={!isOpen}
    >
      {/* Backdrop — click to dismiss */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md glass rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
