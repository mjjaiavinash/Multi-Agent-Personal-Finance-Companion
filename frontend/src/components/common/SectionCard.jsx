import React, { isValidElement } from "react";

/**
 * Reusable section card wrapper.
 *
 * Replaces the repeated `glass rounded-2xl p-6` pattern across every page.
 * Accepts an optional header with title, subtitle, icon, and action slot.
 */
export default function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  className = "",
  children,
}) {
  const hasHeader = title || Icon || action;

  const renderIcon = () => {
    if (!Icon) return null;
    if (isValidElement(Icon)) return Icon;
    if (typeof Icon === "function" || (typeof Icon === "object" && Icon !== null)) {
      const Comp = Icon;
      return <Comp size={20} />;
    }
    return null;
  };

  return (
    <div className={`glass rounded-2xl overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
          <div className="flex items-center gap-2.5">
            {Icon && <span className="text-primary-400">{renderIcon()}</span>}
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
