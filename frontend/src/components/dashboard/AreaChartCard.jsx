import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800/95 border border-surface-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md space-y-1.5 min-w-[150px]">
      <p className="text-xs font-semibold text-slate-400 border-b border-surface-700/60 pb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between text-xs gap-3">
          <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}:
          </span>
          <span className="font-bold text-slate-100">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function AreaChartCard({ data = [], confidence = 85 }) {
  const hasData = data.length > 0;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 border border-surface-700/50 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="text-indigo-400" size={18} />
            AI Spending Prediction Forecast
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Historical trajectory transitioning into AI projected spending</p>
        </div>
        {hasData && (
          <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {confidence}% Confidence
          </span>
        )}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="period"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "10px", fontSize: "12px", color: "#cbd5e1" }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Historical Spend"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#actualAreaGrad)"
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="predicted"
              name="AI Forecasted Spend"
              stroke="#10b981"
              strokeWidth={3}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#predictAreaGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-500">
          <div className="w-14 h-14 rounded-2xl bg-surface-700/40 border border-surface-700 flex items-center justify-center">
            <Sparkles size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium">No prediction graph data available</p>
        </div>
      )}
    </div>
  );
}
