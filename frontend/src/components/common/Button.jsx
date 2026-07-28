/**
 * Reusable accessible Button component.
 *
 * Variants: primary | secondary | danger | ghost
 * Sizes:    sm | md | lg
 *
 * Accessibility:
 *  - focus-visible ring for keyboard navigation (not shown on mouse click)
 *  - aria-busy="true" during loading state to announce activity to screen readers
 *  - Spinner labelled via aria-hidden to avoid duplicate announcements
 *  - Spread props support forwarding aria-label, aria-controls, etc.
 */

const variants = {
  primary:   "bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm shadow-primary-900/30",
  secondary: "bg-surface-700 hover:bg-surface-600 active:bg-surface-500 text-slate-100 border border-surface-600",
  danger:    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-900/30",
  ghost:     "bg-transparent hover:bg-surface-700 active:bg-surface-600 text-slate-300 hover:text-slate-100",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2   text-sm gap-2",
  lg: "px-6 py-3   text-base gap-2",
};

export default function Button({
  children,
  variant  = "primary",
  size     = "md",
  className = "",
  loading  = false,
  disabled,
  ...props
}) {
  const isDisabled = loading || disabled;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] ?? variants.primary}
        ${sizes[size]       ?? sizes.md}
        ${className}
      `}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {/* Spinner: aria-hidden so screen readers don't announce "spinning" + the child label */}
      {loading && (
        <span
          aria-hidden="true"
          className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0"
        />
      )}
      {children}
    </button>
  );
}
