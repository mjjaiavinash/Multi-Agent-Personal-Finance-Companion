import { useEffect, useState } from "react";
import {
  Target, RefreshCw, TrendingDown, TrendingUp,
  PiggyBank, Lightbulb, AlertTriangle, BarChart2,
  ChevronDown, ChevronUp, CheckCircle2, Clock,
} from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
} from "recharts";

import Loader      from "../components/common/Loader";
import Button      from "../components/common/Button";
import ErrorBanner from "../components/common/ErrorBanner";
import SectionCard from "../components/common/SectionCard";
import StatCard    from "../components/common/StatCard";
import useApi      from "../hooks/useApi";
import { getBudgetPlan } from "../api/budget";
import { formatCurrency, CATEGORY_COLORS } from "../utils/helpers";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Grade → color mapping for the budget health score badge */
const GRADE_STYLES = {
  A: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  B: "text-cyan-400    bg-cyan-500/10    border-cyan-500/30",
  C: "text-amber-400   bg-amber-500/10   border-amber-500/30",
  D: "text-orange-400  bg-orange-500/10  border-orange-500/30",
  F: "text-rose-400    bg-rose-500/10    border-rose-500/30",
};

/** Status → display config for category budget rows */
const STATUS_CONFIG = {
  on_track:    { label: "On Track",    cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  over_budget: { label: "Over Budget", cls: "text-rose-400    bg-rose-500/10    border-rose-500/20" },
  under_budget:{ label: "Under",       cls: "text-cyan-400    bg-cyan-500/10    border-cyan-500/20" },
  no_data:     { label: "No Data",     cls: "text-slate-400   bg-surface-700    border-surface-600" },
};

const SEVERITY_CONFIG = {
  high:   "text-rose-400   bg-rose-500/10   border-rose-500/20",
  medium: "text-amber-400  bg-amber-500/10  border-amber-500/20",
  low:    "text-slate-400  bg-surface-700   border-surface-600",
};

const PRIORITY_CONFIG = {
  high:   "text-rose-400",
  medium: "text-amber-400",
  low:    "text-slate-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Collapsible tips list for category budget rows */
function TipsList({ tips }) {
  const [open, setOpen] = useState(false);
  if (!tips?.length) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? "Hide tips" : `${tips.length} tip${tips.length > 1 ? "s" : ""}`}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <CheckCircle2 size={12} className="text-primary-400/60 flex-shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Horizontal progress bar showing current spend vs recommended budget */
function BudgetBar({ current, recommended }) {
  // Cap the fill at 120% so extreme overspend doesn't break the layout
  const pct = recommended > 0 ? Math.min((current / recommended) * 100, 120) : 0;
  const isOver = current > recommended;

  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Avg: {formatCurrency(current)}</span>
        <span>Budget: {formatCurrency(recommended)}</span>
      </div>
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver ? "bg-rose-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Section: Summary Stats ───────────────────────────────────────────────────

function SummarySection({ summary }) {
  if (!summary) return null;

  const gradeStyle = GRADE_STYLES[summary.budgetHealthGrade] || GRADE_STYLES.F;

  // Radial chart data for the health score gauge
  const gaugeData = [{ value: summary.budgetHealthScore, fill: "#8b5cf6" }];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Health Score — radial gauge */}
      <div className="glass rounded-2xl p-5 flex flex-col gap-3 sm:col-span-2 xl:col-span-1">
        <p className="text-sm font-medium text-slate-400">Budget Health</p>
        <div className="flex items-center gap-4">
          {/* Radial gauge */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="65%" outerRadius="100%"
                startAngle={90} endAngle={-270}
                data={gaugeData}
                barSize={8}
              >
                {/* Background track */}
                <RadialBar
                  background={{ fill: "#1e293b" }}
                  dataKey="value"
                  cornerRadius={4}
                  max={100}
                />
                <Tooltip content={() => null} />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Score label centered inside the gauge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-100">{summary.budgetHealthScore}</span>
            </div>
          </div>
          <div>
            <span className={`text-2xl font-black px-3 py-1 rounded-xl border ${gradeStyle}`}>
              {summary.budgetHealthGrade}
            </span>
            <p className="text-xs text-slate-500 mt-1.5">
              Based on {summary.basedOnMonths}mo of data
            </p>
          </div>
        </div>
      </div>

      <StatCard
        title="Monthly Income"
        value={formatCurrency(summary.monthlyIncome)}
        subtitle={summary.estimationMethod}
        icon={TrendingUp}
        color="cyan"
      />
      <StatCard
        title="Total Budgeted"
        value={formatCurrency(summary.totalBudgeted)}
        subtitle="Across all categories"
        icon={BarChart2}
        color="primary"
      />
      <StatCard
        title="Monthly Savings"
        value={formatCurrency(summary.totalSavingsTarget)}
        subtitle={`Buffer: ${formatCurrency(summary.remainingBuffer)}`}
        icon={PiggyBank}
        color={summary.remainingBuffer >= 0 ? "emerald" : "rose"}
        trend={
          summary.remainingBuffer >= 0
            ? { label: "Positive buffer", positive: true }
            : { label: "Negative buffer", positive: false }
        }
      />
    </div>
  );
}

// ─── Section: Category Budgets ────────────────────────────────────────────────

function CategoryBudgetsSection({ categories }) {
  if (!categories?.length) return null;

  // Sort: over_budget first, then by absolute change descending
  const sorted = [...categories].sort((a, b) => {
    if (a.status === "over_budget" && b.status !== "over_budget") return -1;
    if (b.status === "over_budget" && a.status !== "over_budget") return  1;
    return Math.abs(b.changeFromCurrent) - Math.abs(a.changeFromCurrent);
  });

  return (
    <SectionCard
      title="Category Budgets"
      subtitle={`${categories.length} categories analyzed`}
      icon={<BarChart2 size={18} />}
    >
      <div className="flex flex-col divide-y divide-surface-700/40">
        {sorted.map((cat) => {
          const statusCfg  = STATUS_CONFIG[cat.status]  || STATUS_CONFIG.no_data;
          const priorityCls = PRIORITY_CONFIG[cat.priority] || PRIORITY_CONFIG.low;
          const dotColor   = CATEGORY_COLORS[cat.category] || "#6b7280";

          return (
            <div key={cat.category} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Category name + color dot */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <p className="text-sm font-medium text-slate-100">{cat.category}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <span className={`text-[10px] font-semibold capitalize ${priorityCls}`}>
                      {cat.priority} priority
                    </span>
                  </div>

                  {/* Rationale */}
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.rationale}</p>

                  {/* Progress bar */}
                  <BudgetBar current={cat.currentMonthlyAvg} recommended={cat.recommendedBudget} />

                  <TipsList tips={cat.tips} />
                </div>

                {/* Change badge */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${cat.changeFromCurrent <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {cat.changeFromCurrent > 0 ? "+" : ""}{formatCurrency(cat.changeFromCurrent)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cat.changePercent > 0 ? "+" : ""}{cat.changePercent?.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Section: Savings Goal ────────────────────────────────────────────────────

function SavingsGoalSection({ goal }) {
  if (!goal) return null;

  const riskCls = {
    low:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-400  bg-amber-500/10  border-amber-500/20",
    high:   "text-rose-400   bg-rose-500/10   border-rose-500/20",
  }[goal.riskLevel] || "";

  return (
    <SectionCard
      title={goal.goalName}
      subtitle="Savings goal & milestones"
      icon={<PiggyBank size={18} />}
      action={
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${riskCls}`}>
          {goal.riskLevel} risk
        </span>
      }
    >
      {/* Key figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Monthly",  value: formatCurrency(goal.monthlyTarget), color: "text-emerald-400" },
          { label: "Weekly",   value: formatCurrency(goal.weeklyTarget),  color: "text-slate-100" },
          { label: "Annual",   value: formatCurrency(goal.annualTarget),  color: "text-primary-400" },
          { label: "Rate",     value: `${goal.savingsRate?.toFixed(1)}%`, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-700/50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-400 leading-relaxed mb-5">{goal.goalDescription}</p>

      {/* Milestone timeline */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-3.5 top-3.5 bottom-3.5 w-px bg-surface-700" />

        <div className="flex flex-col gap-4">
          {goal.milestones.map((m, i) => (
            <div key={i} className="flex items-start gap-4 relative">
              {/* Node */}
              <div className="w-7 h-7 rounded-full bg-surface-800 border-2 border-primary-500/50 flex items-center justify-center flex-shrink-0 z-10">
                <Clock size={12} className="text-primary-400" />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{m.label}</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(m.amount)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{m.months} months</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Section: Budget Insights ─────────────────────────────────────────────────

function BudgetInsightsSection({ insights }) {
  if (!insights?.length) return null;

  // Sort by impact: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = [...insights].sort((a, b) => (order[a.impact] ?? 3) - (order[b.impact] ?? 3));

  return (
    <SectionCard
      title="Budget Insights"
      subtitle={`${insights.length} actionable insights`}
      icon={<Lightbulb size={18} />}
    >
      <div className="flex flex-col gap-4">
        {sorted.map((insight) => {
          const impactCls = {
            high:   "border-l-rose-500",
            medium: "border-l-amber-500",
            low:    "border-l-slate-600",
          }[insight.impact] || "border-l-slate-600";

          return (
            <div
              key={insight.id}
              className={`pl-4 border-l-2 ${impactCls}`}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-100">{insight.title}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                  SEVERITY_CONFIG[insight.impact] || SEVERITY_CONFIG.low
                }`}>
                  {insight.impact} impact
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{insight.description}</p>
              {insight.category && (
                <p className="text-[10px] text-slate-600 mt-1">{insight.category}</p>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Section: Next Month Forecast ─────────────────────────────────────────────

function ForecastSection({ forecast }) {
  if (!forecast) return null;

  return (
    <SectionCard
      title="Next Month Forecast"
      subtitle="AI-projected spending outlook"
      icon={<TrendingDown size={18} />}
      action={
        <div className="text-right">
          <p className="text-xs text-slate-500">Confidence</p>
          <p className="text-sm font-bold text-primary-400">{forecast.confidenceLevel}%</p>
        </div>
      }
    >
      {/* Key forecast figures */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Projected Spend</p>
          <p className="text-xl font-bold text-rose-400">{formatCurrency(forecast.projectedSpend)}</p>
        </div>
        <div className="bg-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Projected Savings</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(forecast.projectedSavings)}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mb-4">{forecast.forecastBasis}</p>

      {/* Warning flags */}
      {forecast.warningFlags?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            Risk Flags
          </p>
          {forecast.warningFlags.map((flag, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-xs ${
                SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.low
              }`}
            >
              <span className="font-semibold flex-shrink-0">{flag.category}</span>
              <span className="text-slate-400">{flag.risk}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPlanner() {
  const [months, setMonths] = useState(3);
  const { data, loading, error, execute } = useApi(getBudgetPlan, null);

  useEffect(() => { execute(months, false); }, [months]);

  const handleRefresh = () => execute(months, true);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Budget Planner</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Groq-powered personalized monthly budget
            {data?.fromCache && (
              <span className="ml-2 text-xs text-primary-400/70">(cached)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month range selector */}
          <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1">
            {[1, 3, 6].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  months === m
                    ? "bg-primary-600 text-white"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={loading}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading && !data && <Loader />}

      {data && (
        <>
          {/* Meta strip */}
          {(data.dataRange || data.generatedAt) && (
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Target size={13} className="text-primary-400" />
                {data.summary?.basedOnMonths} months analyzed
              </span>
              {data.dataRange && (
                <>
                  <span>·</span>
                  <span>{data.dataRange}</span>
                </>
              )}
              {data.generatedAt && (
                <>
                  <span>·</span>
                  <span>Generated {new Date(data.generatedAt).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          )}

          {/* Plan summary text */}
          {data.summary?.planSummary && (
            <div className="px-4 py-3 rounded-xl bg-primary-500/5 border border-primary-500/20 text-sm text-slate-300 leading-relaxed">
              {data.summary.planSummary}
            </div>
          )}

          {/* Summary stat cards + health gauge */}
          <SummarySection summary={data.summary} />

          {/* Category budgets — largest section */}
          <CategoryBudgetsSection categories={data.categoryBudgets} />

          {/* Savings goal + forecast side by side on wide screens */}
          <div className="grid md:grid-cols-2 gap-6">
            <SavingsGoalSection goal={data.savingsGoal} />
            <ForecastSection    forecast={data.nextMonthForecast} />
          </div>

          {/* Insights — full width */}
          <BudgetInsightsSection insights={data.budgetInsights} />

          {/* Partial recovery notice */}
          {data.partialRecovery && (
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              Some sections could not be fully analyzed. Refresh to retry.
            </div>
          )}
        </>
      )}
    </div>
  );
}
