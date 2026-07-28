import React from 'react';
import { Lightbulb, Target } from 'lucide-react';
import SectionCard from '../common/SectionCard';
import { formatCurrency } from '../../utils/helpers';

const DIFFICULTY_COLOR = {
  easy:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard:     "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const IMPACT_COLOR = {
  high:   "text-rose-400",
  medium: "text-amber-400",
  low:    "text-slate-400",
};

export default function SavingsSuggestionsSection({ data }) {
  const suggestions = data?.savingsSuggestions;
  if (!suggestions?.length) return null;

  const estimate = data?.monthlySavingsEstimate?.realistic ?? 0;

  return (
    <SectionCard
      title="Savings Suggestions"
      icon={<Lightbulb size={18} />}
      subtitle="AI-driven recommendations to improve your savings rate"
      action={
        <div className="text-right">
          <p className="text-xs text-slate-500">Est. Monthly Savings</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(estimate)}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {suggestions.slice(0, 4).map((s, i) => (
          <div key={i} className="p-4 rounded-xl bg-surface-700/40 border border-surface-600/50">
            <div className="flex justify-between items-start mb-1.5 gap-2">
              <h4 className="text-sm font-semibold text-slate-100">{s.title}</h4>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border flex-shrink-0 ${DIFFICULTY_COLOR[s.difficulty] || DIFFICULTY_COLOR.moderate}`}>
                {s.difficulty}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">{s.rationale}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-medium">
                <Target size={12} />
                Save {formatCurrency(s.estimatedSaving ?? 0)}/mo
              </div>
              <span className={`text-xs font-medium ${IMPACT_COLOR[s.impact] || IMPACT_COLOR.low}`}>
                {s.impact} impact
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
