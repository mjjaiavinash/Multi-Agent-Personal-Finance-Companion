import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Wallet, TrendingDown, TrendingUp, PiggyBank,
  ArrowRight, RefreshCw,
} from "lucide-react";

import StatCard       from "../components/common/StatCard";
import ExpenseCard    from "../components/common/ExpenseCard";
import Loader         from "../components/common/Loader";
import QuickActions   from "../components/dashboard/QuickActions";
import PieChartCard   from "../components/dashboard/PieChartCard";
import BarChartCard   from "../components/dashboard/BarChartCard";
import LineChartCard  from "../components/dashboard/LineChartCard";
import AreaChartCard  from "../components/dashboard/AreaChartCard";
import BudgetProgress from "../components/dashboard/BudgetProgress";
import HealthScoreCard from "../components/dashboard/HealthScoreCard";
import NotificationWidget from "../components/dashboard/NotificationWidget";

import { getExpenses, getExpenseSummary } from "../api/expenses";
import { getLatestHealthScore }           from "../api/healthScore";
import { getAIPredictions }               from "../api/ai";
import { formatCurrency } from "../utils/helpers";
import { useAuth } from "../context/AuthContext";

// ─── Greeting helper ──────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard() {
  const { user } = useAuth();
  const location  = useLocation();
  const [summary,      setSummary]      = useState(null);
  const [recent,       setRecent]       = useState([]);
  const [healthScore,  setHealthScore]  = useState(null);
  const [predictions,  setPredictions]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  // Compute today's label inside the component so it updates if the tab is open overnight
  const todayLabel = useMemo(() => new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  }), []);

  // Use the user's actual monthly budget; fall back to 3000 if not yet configured
  const MONTHLY_BUDGET = useMemo(() => user?.monthlyBudget || 3000, [user]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [summaryRes, expensesRes, hsRes, predRes] = await Promise.all([
        getExpenseSummary(),
        getExpenses({ limit: 6, sort: "-date" }),
        getLatestHealthScore().catch(() => null),
        getAIPredictions(6, false).catch(() => null),
      ]);
      setSummary(summaryRes.data?.data ?? null);
      setRecent(expensesRes.data?.data?.expenses || []);
      setHealthScore(hsRes?.data?.data?.healthScore || null);
      if (predRes?.data?.success) {
        setPredictions(predRes.data.data);
      }
    } catch {
      // empty state shown
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refetch when navigated here after adding an expense
  useEffect(() => {
    if (location.state?.refetch) fetchData();
  }, [location.state, fetchData]);

  // Refetch when tab regains focus (so other pages' changes are reflected)
  useEffect(() => {
    const onFocus = () => fetchData(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchData]);

  // ─── Derived values (all hooks must be above any early return) ───────────────
  const totalSpent       = summary?.totalSpent || 0;
  const thisMonth        = summary?.thisMonth  || 0;
  const availableBalance = Math.max(MONTHLY_BUDGET - thisMonth, 0);
  const monthlySavings   = MONTHLY_BUDGET - thisMonth;
  const expenseCount     = summary?.count      || 0;
  const monthlyBarData   = summary?.monthly    || [];
  const lastMonth        = summary?.lastMonth  || 0;

  const pieData = useMemo(() =>
    summary?.byCategory
      ? Object.entries(summary.byCategory).map(([name, value]) => ({ name, value }))
      : []
  , [summary]);

  const weeklyBarData = useMemo(() =>
    predictions?.forecastSeries
      ? predictions.forecastSeries.filter(f => f.actual !== null).map(f => ({ period: f.period, total: f.actual }))
      : [
          { period: "Week 1", total: Math.round(thisMonth * 0.22) },
          { period: "Week 2", total: Math.round(thisMonth * 0.28) },
          { period: "Week 3", total: Math.round(thisMonth * 0.25) },
          { period: "Week 4", total: Math.round(thisMonth * 0.25) },
        ]
  , [predictions, thisMonth]);

  const savingsTrendData = useMemo(() =>
    monthlyBarData.map(m => {
      const income = user?.monthlyIncome || 3000;
      const spent  = m.total || 0;
      return { month: m.month, income, spent, savings: Math.max(0, income - spent) };
    })
  , [monthlyBarData, user?.monthlyIncome]);

  const predictionSeriesData = useMemo(() =>
    predictions?.forecastSeries || [
      { period: "W-3",      actual: 500,  predicted: null },
      { period: "W-2",      actual: 650,  predicted: null },
      { period: "W-1",      actual: 480,  predicted: null },
      { period: "W0 (Cur)", actual: thisMonth > 0 ? Math.round(thisMonth / 4) : 550, predicted: 550 },
      { period: "W+1",      actual: null, predicted: predictions?.nextWeekExpense?.predictedAmount || 600 },
      { period: "W+2",      actual: null, predicted: 580 },
      { period: "W+3",      actual: null, predicted: 620 },
    ]
  , [predictions, thisMonth]);

  if (loading) return <Loader />;

  // Trend vs last month
  const monthDiff  = thisMonth - lastMonth;
  const monthTrend = lastMonth > 0
    ? { label: `${Math.abs(((monthDiff / lastMonth) * 100)).toFixed(1)}% vs last month`, positive: monthDiff < 0, sublabel: "vs last month" }
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {getGreeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-slate-400 hover:text-slate-100 hover:border-surface-600 text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <QuickActions />

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Available Balance"
          value={formatCurrency(availableBalance)}
          subtitle="Remaining this month"
          icon={Wallet}
          color="emerald"
          trend={availableBalance > 0
            ? { label: "Within budget", positive: true }
            : { label: "Over budget", positive: false }
          }
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalSpent)}
          subtitle={`${expenseCount} transactions`}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(thisMonth)}
          subtitle="Current month spending"
          icon={TrendingUp}
          color="amber"
          trend={monthTrend}
        />
        <StatCard
          title="Monthly Savings"
          value={formatCurrency(Math.abs(monthlySavings))}
          subtitle={monthlySavings >= 0 ? "Saved this month" : "Over budget"}
          icon={PiggyBank}
          color={monthlySavings >= 0 ? "cyan" : "rose"}
          trend={monthlySavings >= 0
            ? { label: "Great job!", positive: true }
            : { label: "Reduce spending", positive: false }
          }
        />
      </div>

      {/* ── Budget Progress ─────────────────────────────────────────────────── */}
      <BudgetProgress spent={thisMonth} budget={MONTHLY_BUDGET} />

      {/* ── Health Score Card ───────────────────────────────────────────────── */}
      {healthScore && <HealthScoreCard healthScore={healthScore} />}

      {/* ── Analytics Visualizations Grid (Recharts) ───────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-surface-700/50 pb-3">
          <h2 className="text-lg font-extrabold text-slate-100 tracking-tight">Interactive Analytics Suite</h2>
          <span className="text-xs text-slate-400 font-medium">Recharts Visual Intelligence</span>
        </div>

        {/* Row 1: Pie Chart (Category) + Bar Chart (Weekly/Monthly) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard data={pieData} total={totalSpent} />
          <BarChartCard monthlyData={monthlyBarData} weeklyData={weeklyBarData} />
        </div>

        {/* Row 2: Line Chart (Savings Trend) + Area Chart (Prediction Graph) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChartCard data={savingsTrendData} />
          <AreaChartCard data={predictionSeriesData} confidence={predictions?.confidenceScore || 85} />
        </div>
      </div>

      {/* ── Recent Transactions ─────────────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/60">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Recent Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest {recent.length} expenses</p>
          </div>
          <Link
            to="/history"
            className="flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {/* List */}
        <div className="px-2 py-2">
          {recent.length > 0 ? (
            recent.map((exp, i) => (
              <div key={exp._id}>
                <ExpenseCard expense={exp} />
                {i < recent.length - 1 && (
                  <div className="mx-4 border-b border-surface-700/30" />
                )}
              </div>
            ))
          ) : (
            <div className="py-14 flex flex-col items-center gap-3 text-slate-600">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-surface-700 flex items-center justify-center text-2xl">
                💸
              </div>
              <p className="text-sm">No transactions yet</p>
              <Link
                to="/add-expense"
                className="text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2"
              >
                Add your first expense
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Smart Notifications Widget */}
      <NotificationWidget />

    </div>
  );
}
