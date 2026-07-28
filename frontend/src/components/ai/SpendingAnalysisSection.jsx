import React, { useState } from 'react';
import { TrendingDown, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SectionCard from '../common/SectionCard';
import { formatCurrency } from '../../utils/helpers';

function TrendBadge({ direction }) {
  const map = {
    increasing: { label: "Increasing ▲", cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    decreasing: { label: "Decreasing ▼", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    stable:     { label: "Stable →",     cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    volatile:   { label: "Volatile ~",   cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  };
  const { label, cls } = map[direction?.toLowerCase()] || map.stable;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function InsightText({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? "Hide insight" : "View insight"}
      </button>
      {open && (
        <p className="mt-2 text-xs text-slate-400 leading-relaxed border-l-2 border-primary-500/30 pl-3">
          {text}
        </p>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function SpendingAnalysisSection({ data, monthlyBreakdown }) {
  if (!data) return null;

  const highestCat = data.highestSpendingCategory;
  const trend = data.monthlyTrend;

  // Use the orchestrator's meta monthly breakdown or pattern's
  const chartData = monthlyBreakdown || [];
  const maxVal = chartData.length ? Math.max(...chartData.map((d) => d.totalSpent || 0)) : 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Highest Category */}
      {highestCat && (
        <SectionCard
          title="Highest Spending Category"
          icon={<TrendingDown size={18} />}
          action={<TrendBadge direction={highestCat.trend} />}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-3xl font-bold text-slate-100">{highestCat.category}</p>
              <p className="text-rose-400 text-lg font-semibold mt-1">{formatCurrency(highestCat.totalAmount)}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {highestCat.percentage}% of total · {formatCurrency(highestCat.monthlyAverage)}/mo avg
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-4xl font-black text-primary-400/20">{highestCat.percentage}%</span>
            </div>
          </div>
          <InsightText text={highestCat.insight} />
        </SectionCard>
      )}

      {/* Monthly Trend */}
      {trend && (
        <SectionCard
          title="Monthly Trend"
          icon={<BarChart2 size={18} />}
          action={<TrendBadge direction={trend.direction} />}
        >
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { label: "Change",    value: `${trend.changePercent > 0 ? "+" : ""}${trend.changePercent?.toFixed(1) || 0}%`, color: trend.changePercent > 0 ? "text-rose-400" : "text-emerald-400" },
              { label: "Forecast",     value: formatCurrency(trend.forecast), color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-surface-700/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#334155", radius: 6 }} />
                <Bar dataKey="totalSpent" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={(entry.totalSpent || 0) === maxVal ? "#8b5cf6" : "#334155"}
                      fillOpacity={(entry.totalSpent || 0) === maxVal ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <InsightText text={trend.insight} />
        </SectionCard>
      )}
    </div>
  );
}
