import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import SectionCard from '../common/SectionCard';
import { formatCurrency } from '../../utils/helpers';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-400 mb-1">{payload[0].name}</p>
        <p className="text-sm font-semibold text-slate-100">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function ExpenseCategoriesSection({ data }) {
  if (!data || !data.categoryBudgets || data.categoryBudgets.length === 0) {
    return null;
  }

  // Use currentSpend for the pie chart breakdown
  const chartData = data.categoryBudgets
    .map(item => ({
      name: item.category,
      value: item.currentSpend || 0,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalSpend = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <SectionCard
      title="Expense Categories"
      icon={<PieChartIcon size={18} />}
      subtitle="Your current spending breakdown"
    >
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full md:w-1/2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-full md:w-1/2 flex flex-col gap-3">
          {chartData.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-surface-700/30 border border-surface-600/50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-slate-200 font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(item.value)}</p>
                <p className="text-xs text-slate-500">{((item.value / totalSpend) * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
