import { Trash2, Pencil } from "lucide-react";
import { formatCurrency, formatDate, CATEGORY_COLORS } from "../../utils/helpers";

export default function ExpenseCard({ expense, onEdit, onDelete }) {
  const color = CATEGORY_COLORS[expense.category] || "#6b7280";
  const initials = expense.category?.slice(0, 2).toUpperCase() || "EX";

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-700/50 transition-all duration-150 group">
      {/* Category Badge */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
        style={{ backgroundColor: `${color}25`, border: `1px solid ${color}40`, color }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{expense.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {expense.category} · {formatDate(expense.date)}
        </p>
      </div>

      {/* Amount + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-semibold text-rose-400">
          -{formatCurrency(expense.amount)}
        </span>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-500 hover:text-primary-400 transition-colors"
              >
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(expense._id)}
                className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
