import { formatCurrency } from "../../utils/helpers";

export default function BudgetProgress({ spent = 0, budget = 0 }) {
  const pct     = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const safe    = pct < 70;
  const warning = pct >= 70 && pct < 90;
  const danger  = pct >= 90;

  const barColor = danger
    ? "from-rose-500 to-rose-600"
    : warning
    ? "from-amber-500 to-orange-500"
    : "from-emerald-500 to-teal-500";

  const textColor = danger
    ? "text-rose-400"
    : warning
    ? "text-amber-400"
    : "text-emerald-400";

  const statusLabel = danger
    ? "Over budget!"
    : warning
    ? "Approaching limit"
    : "On track";

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">Monthly Budget</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatCurrency(spent)} of {formatCurrency(budget)} used
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${textColor}`}>{pct.toFixed(0)}%</p>
          <p className={`text-xs font-medium ${textColor}`}>{statusLabel}</p>
        </div>
      </div>

      {/* Track */}
      <div className="w-full h-2.5 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>$0</span>
        <span className={`font-medium ${textColor}`}>
          {formatCurrency(Math.max(budget - spent, 0))} remaining
        </span>
        <span>{formatCurrency(budget)}</span>
      </div>
    </div>
  );
}
