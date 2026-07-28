import { useId } from "react";

export default function Input({ label, error, className = "", id: propId, rightIcon, ...props }) {
  const generatedId = useId();
  const inputId     = propId ?? generatedId;
  const errorId     = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={`w-full px-4 py-2.5 rounded-lg bg-surface-700 border ${
            error ? "border-rose-500 focus:ring-rose-500" : "border-surface-600 focus:ring-primary-500"
          } text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${rightIcon ? "pr-11" : ""} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
