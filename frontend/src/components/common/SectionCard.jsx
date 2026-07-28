/**
 * Reusable section card wrapper.
 *
 * Replaces the repeated `glass rounded-2xl p-6` pattern across every page.
 * Accepts an optional header with title, subtitle, icon, and action slot.
 *
 * @param {string}    title
 * @param {string}    subtitle
 * @param {ReactNode} icon       - Lucide icon element
 * @param {ReactNode} action     - Right-side header slot (button, badge, etc.)
 * @param {string}    className  - Extra classes for the card wrapper
 * @param {ReactNode} children
 */
export default function SectionCard({
  title,
  subtitle,
  icon,
  action,
  className = "",
  children,
}) {
  const hasHeader = title || icon || action;

  return (
    <div className={`glass rounded-2xl overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-primary-400">{icon}</span>}
            <div>
              {title    && <p className="text-base font-semibold text-slate-100">{title}</p>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
