import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { BarChart3, Calendar } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800/95 border border-surface-700/80 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md">
      <p className="text-xs text-slate-400 mb-0.5 font-medium">{label}</p>
      <p className="text-sm font-bold text-slate-100">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export default function BarChartCard({ monthlyData = [], weeklyData = [] }) {
  const [mode, setMode] = useState("monthly"); // "monthly" or "weekly"

  const data = mode === "monthly" ? monthlyData : weeklyData;
  const labelKey = mode === "monthly" ? "month" : "period";
  const hasData = data && data.length > 0;
  const maxVal = hasData ? Math.max(...data.map((d) => d.total || 0)) : 0;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 border border-surface-700/50 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={18} />
            {mode === "monthly" ? "Monthly Spending Dynamics" : "Weekly Spending Breakdown"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === "monthly" ? "Comparing total expenditure month-over-month" : "Weekly velocity over recent periods"}
          </p>
        </div>

        {/* Switcher */}
        <div className="flex items-center gap-1 bg-surface-900/90 border border-surface-700/80 rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setMode("monthly")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === "monthly"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setMode("weekly")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === "weekly"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.6} />
            <XAxis
              dataKey={labelKey}
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(51, 65, 85, 0.4)", radius: 8 }} />
            <Bar dataKey="total" radius={[8, 8, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.total === maxVal ? "#8b5cf6" : "#6366f1"}
                  fillOpacity={entry.total === maxVal ? 1 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-500">
          <div className="w-14 h-14 rounded-2xl bg-surface-700/40 border border-surface-700 flex items-center justify-center">
            <Calendar size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium">No spending data available</p>
        </div>
      )}
    </div>
  );
}
