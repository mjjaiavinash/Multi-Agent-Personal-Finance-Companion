import React from 'react';
import { Wallet } from 'lucide-react';
import SectionCard from '../common/SectionCard';
import { formatCurrency } from '../../utils/helpers';

const STATUS_COLOR = {
  on_track:     "text-emerald-400",
  over_budget:  "text-rose-400",
  under_budget: "text-cyan-400",
  no_data:      "text-slate-500",
};

export default function BudgetPlanSection({ data }) {
  const categoryBudgets = data?.categoryBudgets;
  if (!categoryBudgets?.length) return null;

  const summary = data?.summary;
  const forecast = data?.nextMonthForecast?.projectedSpend;
  const savingsGoal = data?.savingsGoal;

  return (
    <SectionCard
      title="AI Budget Plan"
      icon={<Wallet size={18} />}
      subtitle={summary?.planSummary || "Your personalized monthly budget breakdown"}
      action={
        forecast ? (
          <div className="text-right">
            <p className="text-xs text-slate-500">Forecasted Spend</p>
            <p className="text-lg font-bold text-slate-100">{formatCurrency(forecast)}</p>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">

        {/* Savings Goal */}
        {savingsGoal && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div>
              <p className="text-sm font-semibold text-emerald-100">{savingsGoal.goalName || "Savings Goal"}</p>
              <p className="text-xs text-emerald-200/70 mt-0.5">{savingsGoal.goalDescription}</p>
            </div>
            <p className="text-lg font-bold text-emerald-400 flex-shrink-0 ml-3">
              {formatCurrency(savingsGoal.monthlyTarget ?? 0)}/mo
            </p>
          </div>
        )}

        {/* Category budgets */}
        <div className="grid sm:grid-cols-2 gap-3">
          {categoryBudgets.slice(0, 6).map((cat, i) => {
            const diff = (cat.recommendedBudget ?? 0) - (cat.currentMonthlyAvg ?? 0);
            return (
              <div key={i} className="p-3 rounded-xl bg-surface-700/30 border border-surface-600/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-200 truncate">{cat.category}</p>
                  <span className={`text-[10px] font-bold uppercase ${STATUS_COLOR[cat.status] || STATUS_COLOR.no_data}`}>
                    {cat.status?.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Current avg</span>
                  <span className="text-slate-300">{formatCurrency(cat.currentMonthlyAvg ?? 0)}</span>
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-primary-400 font-medium">Recommended</span>
                  <span className="text-primary-400 font-bold">{formatCurrency(cat.recommendedBudget ?? 0)}</span>
                </div>
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${diff <= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"}`}>
                  {diff <= 0 ? `Cut ₹${Math.abs(diff).toFixed(0)}` : `+₹${diff.toFixed(0)}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
