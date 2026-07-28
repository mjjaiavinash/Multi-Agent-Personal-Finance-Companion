import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { formatCurrency, CATEGORY_COLORS } from "../../utils/helpers";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-surface-800/95 border border-surface-700/80 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md">
      <p className="text-xs text-slate-400 font-medium mb-0.5">{name}</p>
      <p className="text-sm font-bold text-slate-100">{formatCurrency(value)}</p>
    </div>
  );
};

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.4))" }}
      />
    </g>
  );
};

const CenterLabel = ({ viewBox, total }) => {
  if (!viewBox || typeof viewBox.cx === "undefined") return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight="500">
        Total Spent
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#f8fafc" fontSize={15} fontWeight="800">
        {formatCurrency(total)}
      </text>
    </g>
  );
};

export default function PieChartCard({ data = [], total = 0 }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const hasData = data && data.length > 0;

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 border border-surface-700/50 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <PieIcon className="text-indigo-400" size={18} />
            Category Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Distribution across spending categories</p>
        </div>
        {hasData && (
          <span className="text-xs text-slate-300 bg-surface-700/60 border border-surface-700 px-2.5 py-1 rounded-full font-semibold">
            {data.length} Categories
          </span>
        )}
      </div>

      {hasData ? (
        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          {/* Donut Chart */}
          <div className="w-full sm:w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || "#6b7280"}
                    />
                  ))}
                  <CenterLabel total={total} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend list */}
          <div className="flex-1 w-full flex flex-col gap-2">
            {data
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((entry, idx) => {
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                const color = CATEGORY_COLORS[entry.name] || "#6b7280";
                const isHovered = activeIndex === idx;

                return (
                  <div
                    key={entry.name}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`flex items-center gap-3 p-1.5 rounded-xl transition-all cursor-pointer ${
                      isHovered ? "bg-surface-700/60 shadow-md" : "hover:bg-surface-700/30"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-semibold text-slate-300 flex-1 truncate">{entry.name}</span>
                    <span className="text-xs font-bold text-slate-100">{formatCurrency(entry.value)}</span>
                    <span
                      className="text-xs font-extrabold w-12 text-right px-1.5 py-0.5 rounded bg-surface-900/60 border border-surface-700/50"
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-500">
          <div className="w-14 h-14 rounded-2xl bg-surface-700/40 border border-surface-700 flex items-center justify-center">
            <PieIcon size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium">No category breakdown data available</p>
        </div>
      )}
    </div>
  );
}
