import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, PiggyBank } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800/95 border border-surface-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md space-y-1.5 min-w-[140px]">
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

export default function LineChartCard({ data = [] }) {
  const hasData = data.length > 0;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 border border-surface-700/50 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <PiggyBank className="text-emerald-400" size={18} />
            Savings & Financial Velocity Trend
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tracking monthly income vs spend & cumulative savings</p>
        </div>
        {hasData && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
            Savings Velocity
          </span>
        )}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="month"
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
            <Line
              type="monotone"
              dataKey="income"
              name="Monthly Income"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: "#6366f1", r: 4 }}
              activeDot={{ r: 6, stroke: "#818cf8", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="spent"
              name="Total Spent"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ fill: "#f43f5e", r: 4 }}
              activeDot={{ r: 6, stroke: "#fb7185", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="savings"
              name="Net Savings"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 7, stroke: "#34d399", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-500">
          <div className="w-14 h-14 rounded-2xl bg-surface-700/40 border border-surface-700 flex items-center justify-center">
            <TrendingUp size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium">No savings trend history available</p>
        </div>
      )}
    </div>
  );
}
