import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, RefreshCw, Sparkles, Zap, CheckCircle2,
  Gauge, PieChart as PieIcon, LineChart as ChartIcon
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Legend
} from "recharts";
import { getAIPredictions } from "../api/ai";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import ErrorBanner from "../components/common/ErrorBanner";

export default function AIPrediction() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async (forceRefresh = false) => {
    setError(null);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getAIPredictions(months, forceRefresh);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setData(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load predictions.";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [months]);

  useEffect(() => {
    fetchPredictions(false);
  }, [fetchPredictions]);

  const handleRefresh = () => {
    fetchPredictions(true);
  };

  const confidenceScore = data?.confidenceScore || 75;
  const confidenceLevel = data?.confidenceLevel || (confidenceScore >= 80 ? "High" : confidenceScore >= 60 ? "Medium" : "Low");
  const nextWeek = data?.nextWeekExpense || {};
  const nextMonth = data?.nextMonthExpense || {};
  const highestCat = data?.highestSpendingCategory || {};
  const savings = data?.savingsForecast || {};
  const budget = data?.budgetForecast || {};
  const categoryForecasts = data?.categoryForecasts || [];
  const forecastSeries = data?.forecastSeries || [];
  const keyDrivers = data?.keyDrivers || [];
  const preventiveRecs = data?.preventiveRecommendations || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* ── 1. Header & Controls ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles size={13} /> AI Predictive Intelligence
            </span>
            {data?.meta?.generatedAt && (
              <span className="text-xs text-slate-400">
                • Analyzed {data.meta.totalTransactionsAnalyzed || 0} expenses
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-indigo-400" size={32} />
            AI Spending Prediction
          </h1>
          <p className="text-slate-400 text-sm">
            Machine Learning & Groq AI forecasts for next week, next month, peak categories, and budget trajectory.
          </p>
        </div>

        {/* Controls & Confidence Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Confidence Score Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-surface-900/90 border border-surface-700">
            <Gauge size={18} className={confidenceScore >= 80 ? "text-emerald-400" : "text-amber-400"} />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Confidence</div>
              <div className="text-sm font-extrabold text-slate-100 flex items-center gap-1">
                {confidenceScore}%
                <span className={`text-xs font-semibold px-1.5 py-0.2 rounded ${
                  confidenceLevel === "High" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {confidenceLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-surface-900/80 border border-surface-700 rounded-xl p-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  months === m
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {m}mo History
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            loading={refreshing || loading}
          >
            <RefreshCw size={15} className={refreshing || loading ? "animate-spin" : ""} />
            Re-run Forecast
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Loading state */}
      {(loading || refreshing) && (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-800/40 border border-surface-700/50 rounded-3xl backdrop-blur-md">
          <Loader size="lg" />
          <p className="mt-4 text-slate-300 font-semibold animate-pulse">
            Computing Groq AI Time-Series Predictions...
          </p>
          <p className="text-xs text-slate-500 mt-1">Analyzing historical velocity, category trends & confidence bounds</p>
        </div>
      )}

      {/* Main Prediction Content */}
      {!loading && !refreshing && data && (
        <>
          {/* ── 2. Top Prediction Metrics Grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Next Week Expense */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Next Week Forecast</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  nextWeek.trendDirection === "decreasing" ? "bg-emerald-500/10 text-emerald-400" :
                  nextWeek.trendDirection === "increasing" ? "bg-rose-500/10 text-rose-400" : "bg-slate-700 text-slate-300"
                }`}>
                  {nextWeek.trendDirection || "stable"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-100">
                ₹{(nextWeek.predictedAmount || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                {nextWeek.changeVsAvgPercent > 0 ? "+" : ""}{nextWeek.changeVsAvgPercent || 0}% vs weekly avg
              </div>
            </div>

            {/* Next Month Expense */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Next Month Forecast</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  nextMonth.trendDirection === "decreasing" ? "bg-emerald-500/10 text-emerald-400" :
                  nextMonth.trendDirection === "increasing" ? "bg-rose-500/10 text-rose-400" : "bg-slate-700 text-slate-300"
                }`}>
                  {nextMonth.trendDirection || "stable"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-indigo-400">
                ₹{(nextMonth.predictedAmount || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">
                {nextMonth.changeVsAvgPercent > 0 ? "+" : ""}{nextMonth.changeVsAvgPercent || 0}% vs monthly avg
              </div>
            </div>

            {/* Highest Spending Category */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Peak Category</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400">
                  {highestCat.sharePercent || 0}% share
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-100 truncate">
                {highestCat.category || "General"}
              </div>
              <div className="text-xs text-slate-400">
                Projected: <span className="text-slate-200 font-semibold">₹{(highestCat.predictedAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Savings Forecast */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Savings Forecast</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  savings.status === "On Track" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {savings.status || "On Track"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">
                ₹{(savings.projectedSavings || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">
                Projected rate: <span className="font-semibold text-slate-200">{savings.projectedSavingsRate || 0}%</span>
              </div>
            </div>

            {/* Budget Forecast */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Budget Forecast</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  budget.status === "Within Budget" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {budget.status || "Within Budget"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-100">
                ₹{(budget.predictedSpent || 0).toLocaleString()}
              </div>
              <div className={`text-xs font-semibold ${
                (budget.projectedVariance || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {(budget.projectedVariance || 0) >= 0 ? "+" : ""}₹{(budget.projectedVariance || 0).toLocaleString()} variance
              </div>
            </div>
          </div>

          {/* ── 3. Time-Series Prediction Graph (Historical vs AI Forecast) ───── */}
          <div className="bg-surface-800/80 border border-surface-700/60 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                  <ChartIcon className="text-indigo-400" size={22} />
                  Historical Spending vs AI Prediction Curve
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Past 4 weeks actual expenditure seamlessly transitioning into next 4 weeks AI forecasted trajectory.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-300">Historical Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 border border-dashed border-emerald-300" />
                  <span className="text-slate-300">AI Forecast</span>
                </div>
              </div>
            </div>

            {/* Recharts AreaChart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastSeries}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val, name) => [`₹${Number(val).toLocaleString()}`, name === "actual" ? "Actual Spend" : "AI Forecast"]}
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#actualGrad)"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#forecastGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── 4. Category Spending Forecast Breakdown ───────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Category Forecast Bar Chart */}
            <div className="lg:col-span-2 bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <PieIcon className="text-indigo-400" size={20} />
                  Category Forecast Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Historical weekly average vs predicted next month spend per category</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryForecasts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(val) => `₹${Number(val).toLocaleString()}`}
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                    />
                    <Legend />
                    <Bar dataKey="historicalWeeklyAvg" name="Hist. Weekly Avg" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="predictedNextMonth" name="Predicted Next Month" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Recommendations & Driver Insights */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="text-amber-400" size={20} />
                  Key Predictive Drivers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Primary factors influencing model projections</p>
              </div>

              {keyDrivers.length > 0 && (
                <ul className="space-y-2.5">
                  {keyDrivers.map((driver, idx) => (
                    <li key={idx} className="p-3 bg-surface-900/60 rounded-xl border border-surface-700/50 text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              )}

              {preventiveRecs.length > 0 && (
                <div className="pt-2 space-y-3 border-t border-surface-700/50">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Preventive Action Tips
                  </h4>
                  <ul className="space-y-2">
                    {preventiveRecs.map((rec, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
