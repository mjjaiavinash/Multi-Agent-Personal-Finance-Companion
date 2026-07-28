import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, RefreshCw, TrendingUp, TrendingDown, Minus, ShieldAlert,
  CheckCircle2, Target, Calendar, Zap, Award, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Sparkles, Clock, PieChart as PieIcon,
  ChevronRight, IndianRupee, Layers, Check, AlertCircle, Info, Download
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  generateMonthlyReport,
  getMonthlyReport,
  listMonthlyReports,
  downloadMonthlyReportPDF
} from "../api/monthlyReport";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import ErrorBanner from "../components/common/ErrorBanner";

// Curated aesthetic color palette for Recharts
const CATEGORY_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
  "#06b6d4", "#f97316", "#14b8a6", "#3b82f6", "#e11d48"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyReport() {
  const { user } = useAuth();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-indexed
  const [incomeInput, setIncomeInput] = useState(user?.monthlyIncome || "");

  const [report, setReport] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState(null);

  // Sync user income when available
  useEffect(() => {
    if (user?.monthlyIncome && !incomeInput) {
      setIncomeInput(user.monthlyIncome);
    }
  }, [user]);

  // Fetch report list history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await listMonthlyReports();
      setHistoryList(res.data?.data?.reports || res.data?.reports || []);
    } catch {
      // Non-blocking
    }
  }, []);

  // Fetch or generate report for selected month
  const loadReport = useCallback(async (forceRegen = false) => {
    setError(null);
    if (forceRegen) setRegenerating(true);
    else setLoading(true);

    try {
      const incomeVal = Number(incomeInput) || 0;

      // Always POST generate — backend overwrites the existing record
      const res = await generateMonthlyReport(selectedYear, selectedMonth, incomeVal);
      const report = res.data?.data?.report || res.data?.report || null;
      setReport(report);
      fetchHistory();
    } catch (err) {
      // If generate fails, try fetching the last saved report
      try {
        const fallback = await getMonthlyReport(selectedYear, selectedMonth);
        const report = fallback.data?.data?.report || fallback.data?.report || null;
        setReport(report);
      } catch {
        setReport(null);
      }
      const msg = err.response?.data?.message || err.message || "Failed to load report.";
      setError(msg);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [selectedYear, selectedMonth, incomeInput, fetchHistory]);

  useEffect(() => {
    loadReport(false);
  }, [selectedYear, selectedMonth]);

  const handleRegenerate = () => {
    loadReport(true);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const res = await downloadMonthlyReportPDF(selectedYear, selectedMonth);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SpendSense_AI_Report_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to download PDF report.";
      setError(msg);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(Number(e.target.value));
  };

  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };

  const reportData = report?.data || {};
  const summary = reportData.summary || {};
  const categoryBreakdown = reportData.categoryBreakdown || [];
  const budgetPerf = reportData.budgetPerformance || {};
  const healthScore = reportData.healthScore || {};
  const weeklyAnalysis = reportData.weeklyAnalysis || [];
  const spendingTrends = reportData.spendingTrends || {};
  const aiRecs = reportData.aiRecommendations || {};

  // Data for Recharts Category Donut
  const pieChartData = categoryBreakdown.map((cat, idx) => ({
    name: cat.category,
    value: cat.total,
    percentage: cat.percentage,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
  }));

  // Data for Daily Pattern Bar Chart
  const dailyPatternData = spendingTrends.dailyPattern || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* ── 1. Top Header & Action Controls ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center gap-1.5">
              <Sparkles size={13} /> AI Financial Intelligence
            </span>
            {report?.createdAt && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} /> Updated {new Date(report.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            <FileText className="text-primary-400" size={32} />
            Monthly Financial Report
          </h1>
          <p className="text-slate-400 text-sm">
            AI-powered financial audit, category breakdowns, health scores, and strategic recommendations.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-surface-900/80 border border-surface-700 rounded-xl px-3 py-2">
            <Calendar size={16} className="text-slate-400" />
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-surface-800 text-slate-200">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-surface-900/80 border border-surface-700 rounded-xl px-3 py-2">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1} className="bg-surface-800 text-slate-200">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Income Input */}
          <div className="flex items-center gap-1 bg-surface-900/80 border border-surface-700 rounded-xl px-3 py-2 max-w-[170px]">
            <span className="text-slate-400 text-xs font-medium">Income:</span>
            <span className="text-slate-400 text-sm font-bold">₹</span>
            <input
              type="number"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              placeholder="Income"
              className="w-full bg-transparent text-sm font-semibold text-slate-100 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Download PDF Button */}
          <Button
            variant="secondary"
            size="md"
            onClick={handleDownloadPDF}
            loading={downloadingPDF}
            disabled={!report}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Download size={16} className={downloadingPDF ? "animate-spin" : ""} />
            Download PDF
          </Button>

          {/* Regenerate Button */}
          <Button
            variant="primary"
            size="md"
            onClick={handleRegenerate}
            loading={regenerating || loading}
            className="shadow-lg shadow-primary-600/30"
          >
            <RefreshCw size={16} className={regenerating || loading ? "animate-spin" : ""} />
            Regenerate Report
          </Button>
        </div>
      </div>

      {/* Error display */}
      <ErrorBanner message={error} />

      {/* Loading state */}
      {(loading || regenerating) && (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-800/40 border border-surface-700/50 rounded-3xl backdrop-blur-md">
          <Loader size="lg" />
          <p className="mt-4 text-slate-300 font-semibold animate-pulse">
            Generating Groq AI Financial Analysis for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
          </p>
          <p className="text-xs text-slate-500 mt-1">Analyzing spending trends, category weights & health scores</p>
        </div>
      )}

      {/* Empty State when no report found or error */}
      {!loading && !regenerating && !report && !error && (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-800/40 border border-surface-700/50 rounded-3xl text-center px-6">
          <div className="p-4 bg-primary-500/10 rounded-full text-primary-400 mb-4">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-100">No Report Generated Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mt-2 mb-6">
            Generate your Groq AI Monthly Financial Report for {MONTH_NAMES[selectedMonth - 1]} {selectedYear} to see deep spending insights.
          </p>
          <Button variant="primary" onClick={handleRegenerate}>
            Generate {MONTH_NAMES[selectedMonth - 1]} Report
          </Button>
        </div>
      )}

      {/* ── Report Content Dashboard ────────────────────────────────────────── */}
      {!loading && !regenerating && report && (
        <>
          {/* ── 2. AI Executive Summary & Key Takeaway Banner ────────────────── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-950/60 via-surface-800 to-indigo-950/40 border border-primary-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm">
                <Sparkles size={18} />
                <span>Groq AI Executive Overview • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
              </div>

              <p className="text-slate-200 text-base md:text-lg leading-relaxed font-medium">
                {summary.overview || "Monthly financial summary is ready for review."}
              </p>

              {summary.keyTakeaway && (
                <div className="flex items-start gap-3 bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4 mt-2">
                  <Zap size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Key Takeaway</span>
                    <p className="text-sm font-semibold text-slate-100 mt-0.5">{summary.keyTakeaway}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Core Financial Key Stats Grid ─────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Income */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Monthly Income</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <IndianRupee size={16} />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100">
                ₹{summary.totalIncome ? summary.totalIncome.toLocaleString() : 0}
              </div>
              <div className="text-xs text-slate-400 mt-2">User configured baseline</div>
            </div>

            {/* Total Expenses */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Total Expenses</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <TrendingDown size={16} />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100">
                ₹{summary.totalExpenses ? summary.totalExpenses.toLocaleString() : 0}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Across <span className="font-bold text-slate-200">{summary.transactionCount || 0}</span> transactions
              </div>
            </div>

            {/* Net Savings & Savings Rate */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Net Savings</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  (summary.savingsRate || 0) >= 20
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : (summary.savingsRate || 0) > 0
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}>
                  {summary.savingsRate ? summary.savingsRate.toFixed(1) : 0}% Rate
                </span>
              </div>
              <div className={`text-2xl md:text-3xl font-extrabold ${
                (summary.netSavings || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                ₹{summary.netSavings ? summary.netSavings.toLocaleString() : 0}
              </div>
              <div className="text-xs text-slate-400 mt-2">Income minus total expenses</div>
            </div>

            {/* Daily Average Spend */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Avg Daily Spend</span>
                <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
                  <Calendar size={16} />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100">
                ₹{summary.avgDailySpend ? summary.avgDailySpend.toLocaleString() : 0}
              </div>
              <div className="text-xs text-slate-400 mt-2">Peak day: <span className="font-semibold text-slate-200">{summary.mostExpensiveDay || "N/A"}</span></div>
            </div>
          </div>

          {/* ── 4. Highest & Lowest Expense Spotlight Cards ─────────────────── */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Highest Expense Card */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-rose-500 pointer-events-none">
                <ArrowUpRight size={100} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <ArrowUpRight size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400">Highest Expense Spotlight</h3>
                  <span className="text-xs text-rose-400 font-medium">Largest single outlay</span>
                </div>
              </div>
              {summary.highestExpense ? (
                <div className="space-y-2">
                  <div className="text-3xl font-black text-rose-400">
                    ₹{summary.highestExpense.amount?.toLocaleString()}
                  </div>
                  <div className="text-lg font-bold text-slate-100">
                    {summary.highestExpense.title || "Unnamed Expense"}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-surface-700 text-slate-300 font-semibold">
                      {summary.highestExpense.category || "General"}
                    </span>
                    {summary.highestExpense.date && (
                      <span>{new Date(summary.highestExpense.date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No expense records available for this month.</p>
              )}
            </div>

            {/* Lowest Expense Card */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-500 pointer-events-none">
                <ArrowDownRight size={100} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ArrowDownRight size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400">Lowest Expense Spotlight</h3>
                  <span className="text-xs text-emerald-400 font-medium">Smallest logged transaction</span>
                </div>
              </div>
              {summary.lowestExpense ? (
                <div className="space-y-2">
                  <div className="text-3xl font-black text-emerald-400">
                    ₹{summary.lowestExpense.amount?.toLocaleString()}
                  </div>
                  <div className="text-lg font-bold text-slate-100">
                    {summary.lowestExpense.title || "Unnamed Expense"}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-surface-700 text-slate-300 font-semibold">
                      {summary.lowestExpense.category || "General"}
                    </span>
                    {summary.lowestExpense.date && (
                      <span>{new Date(summary.lowestExpense.date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No expense records available for this month.</p>
              )}
            </div>
          </div>

          {/* ── 5. Financial Health & Budget Performance Scores ───────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Financial Health Scorecard */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Award size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Financial Health Score</h3>
                    <p className="text-xs text-slate-400">Multi-component holistic analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-slate-100">{healthScore.score || 0}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  <span className={`ml-2 px-3 py-1 rounded-xl text-xs font-bold ${
                    healthScore.grade === "Excellent" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                    healthScore.grade === "Good" ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" :
                    healthScore.grade === "Average" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                    "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}>
                    {healthScore.grade || "N/A"}
                  </span>
                </div>
              </div>

              {/* Summary */}
              {healthScore.summary && (
                <p className="text-sm text-slate-300 bg-surface-900/50 p-3.5 rounded-xl border border-surface-700/50">
                  {healthScore.summary}
                </p>
              )}

              {/* Components breakdown */}
              {healthScore.components && (
                <div className="space-y-3.5 pt-2">
                  {[
                    { label: "Savings Rate Score", score: healthScore.components.savingsRate, color: "bg-emerald-500" },
                    { label: "Budget Adherence", score: healthScore.components.budgetAdherence, color: "bg-indigo-500" },
                    { label: "Spending Consistency", score: healthScore.components.spendingConsistency, color: "bg-purple-500" },
                    { label: "Expense to Income Ratio", score: healthScore.components.expenseToIncome, color: "bg-amber-500" },
                  ].map((comp) => (
                    <div key={comp.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{comp.label}</span>
                        <span className="text-slate-100 font-bold">{comp.score || 0}/100</span>
                      </div>
                      <div className="h-2 w-full bg-surface-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${comp.color} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, comp.score || 0))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Performance Scorecard */}
            <div className="bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Target size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Budget Performance</h3>
                    <p className="text-xs text-slate-400">Adherence to target budget</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-slate-100">{budgetPerf.score || 0}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  <span className="ml-2 px-3 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Grade {budgetPerf.grade || "N/A"}
                  </span>
                </div>
              </div>

              {/* Budget Variance */}
              <div className="grid grid-cols-2 gap-4 bg-surface-900/60 p-4 rounded-2xl border border-surface-700/50">
                <div>
                  <span className="text-xs text-slate-400">Total Budget Target</span>
                  <div className="text-lg font-bold text-slate-200">
                    ₹{budgetPerf.totalBudget ? budgetPerf.totalBudget.toLocaleString() : 0}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Budget Variance</span>
                  <div className={`text-lg font-bold ${
                    (budgetPerf.variance || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {(budgetPerf.variance || 0) >= 0 ? "+" : ""}₹{budgetPerf.variance ? budgetPerf.variance.toLocaleString() : 0}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {budgetPerf.summary && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {budgetPerf.summary}
                </p>
              )}

              {/* Top Over/Under Categories */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface-900/40 border border-surface-700/40 text-xs space-y-1">
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <TrendingUp size={13} /> Top Overspend
                  </span>
                  <p className="text-slate-200 font-bold text-sm">
                    {budgetPerf.topOverspendCategory || "None"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-900/40 border border-surface-700/40 text-xs space-y-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingDown size={13} /> Top Underspend
                  </span>
                  <p className="text-slate-200 font-bold text-sm">
                    {budgetPerf.topUnderspendCategory || "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 6. Category-wise Spending Breakdown ──────────────────────────── */}
          <div className="bg-surface-800/80 border border-surface-700/60 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                  <PieIcon className="text-primary-400" size={22} />
                  Category-wise Spending Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-1">Detailed allocation across categories with AI insights</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-center">
              {/* Recharts Pie Chart */}
              <div className="h-64 relative flex items-center justify-center">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => `₹${Number(val).toLocaleString()}`}
                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-sm">No category data</p>
                )}
              </div>

              {/* Category Table */}
              <div className="lg:col-span-2 space-y-3 max-h-[380px] overflow-y-auto pr-2">
                {categoryBreakdown.map((cat, idx) => {
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div
                      key={cat.category}
                      className="bg-surface-900/60 border border-surface-700/50 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-surface-600 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            {cat.category}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-700 text-slate-400">
                              {cat.percentage}%
                            </span>
                          </div>
                          {cat.insight && (
                            <p className="text-xs text-slate-400 mt-0.5">{cat.insight}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                        <div>
                          <div className="font-extrabold text-slate-100 text-sm">₹{cat.total?.toLocaleString()}</div>
                          <div className="text-[11px] text-slate-400">{cat.count} txns • Avg ₹{cat.avgPerTx}</div>
                        </div>

                        {cat.vsLastMonth !== undefined && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                            cat.vsLastMonth > 0 ? "bg-rose-500/10 text-rose-400" :
                            cat.vsLastMonth < 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"
                          }`}>
                            {cat.vsLastMonth > 0 ? "+" : ""}{cat.vsLastMonth}% MoM
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 7. Spending Trends & Daily Pattern Chart ─────────────────────── */}
          <div className="bg-surface-800/80 border border-surface-700/60 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                  <TrendingUp className="text-indigo-400" size={22} />
                  Spending Trends & MoM Analysis
                </h3>
                <p className="text-xs text-slate-400 mt-1">Day-of-week breakdown and spending direction</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Direction: {spendingTrends.direction || "Stable"}
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/30">
                  Consistency: {spendingTrends.consistencyScore || 50}/100
                </span>
              </div>
            </div>

            {spendingTrends.insight && (
              <p className="text-sm text-slate-300 bg-surface-900/50 p-4 rounded-2xl border border-surface-700/50">
                {spendingTrends.insight}
              </p>
            )}

            {/* Daily Pattern Recharts Bar Chart */}
            {dailyPatternData.length > 0 && (
              <div className="pt-2 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Daily Spend Pattern (Sun - Sat)</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyPatternData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(val) => [`₹${val}`, "Avg Spend"]}
                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                      />
                      <Bar dataKey="avgSpend" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ── 8. Weekly Breakdown Cards ────────────────────────────────────── */}
          {weeklyAnalysis.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                <Layers className="text-emerald-400" size={22} />
                Weekly Analysis Breakdown
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklyAnalysis.map((wk) => (
                  <div key={wk.week} className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-sm">{wk.week}</span>
                      <span className="text-emerald-400 font-extrabold text-base">₹{wk.totalSpent?.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 border-t border-b border-surface-700/50 py-2">
                      <span>Txns: <strong className="text-slate-200">{wk.txCount}</strong></span>
                      <span>Top: <strong className="text-primary-400">{wk.topCategory}</strong></span>
                    </div>

                    {wk.insight && (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {wk.insight}
                      </p>
                    )}
                    {wk.standoutFact && (
                      <div className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ⚡ {wk.standoutFact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 9. AI Strategic Recommendations & Action Plan ───────────────── */}
          <div className="bg-surface-800/80 border border-surface-700/60 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-8">
            <div>
              <div className="flex items-center gap-2.5 text-xl font-bold text-slate-100">
                <Sparkles size={24} className="text-amber-400" />
                AI Strategic Action Plan & Recommendations
              </div>
              <p className="text-xs text-slate-400 mt-1">Actionable insights to optimize your savings and reduce overspending next month</p>
            </div>

            {/* Immediate Ranked Actions */}
            {aiRecs.immediateActions && aiRecs.immediateActions.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Top Priority Immediate Actions</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {aiRecs.immediateActions.map((act) => (
                    <div key={act.rank} className="bg-surface-900/80 border border-surface-700/60 p-5 rounded-2xl space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-full bg-primary-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                          #{act.rank}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          act.impact === "high" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          act.impact === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {act.impact} Impact
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100">{act.action}</p>
                      {act.estimatedSaving > 0 && (
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <IndianRupee size={12} /> Est. Saving: ₹{act.estimatedSaving.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Savings Opportunities */}
            {aiRecs.savingsOpportunities && aiRecs.savingsOpportunities.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Identified Savings Opportunities</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {aiRecs.savingsOpportunities.map((opp, idx) => (
                    <div key={idx} className="bg-surface-900/60 border border-surface-700/50 p-5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-sm">{opp.title}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-surface-700 text-slate-300">
                          {opp.difficulty} difficulty
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{opp.description}</p>
                      {opp.estimatedSaving > 0 && (
                        <div className="text-xs font-bold text-emerald-400 pt-1">
                          Potential Savings: ₹{opp.estimatedSaving.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Positive Highlights & Risk Alerts */}
            <div className="grid md:grid-cols-2 gap-6 pt-2">
              {/* Positive Highlights */}
              {aiRecs.positiveHighlights && aiRecs.positiveHighlights.length > 0 && (
                <div className="space-y-3 bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-2xl">
                  <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Positive Highlights
                  </h4>
                  <ul className="space-y-2">
                    {aiRecs.positiveHighlights.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Alerts */}
              {aiRecs.riskAlerts && aiRecs.riskAlerts.length > 0 && (
                <div className="space-y-3 bg-rose-950/20 border border-rose-500/20 p-5 rounded-2xl">
                  <h4 className="text-xs font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Risk Alerts
                  </h4>
                  <ul className="space-y-2">
                    {aiRecs.riskAlerts.map((alert, idx) => (
                      <li key={idx} className="text-xs text-slate-200 space-y-0.5">
                        <div className="font-bold text-rose-300 flex items-center gap-1">
                          <span>{alert.title}</span>
                          {alert.severity && (
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">
                              {alert.severity}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300">{alert.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Month Goals */}
            {aiRecs.nextMonthGoals && aiRecs.nextMonthGoals.length > 0 && (
              <div className="space-y-3 bg-surface-900/70 border border-surface-700/60 p-5 rounded-2xl">
                <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={16} /> Actionable Goals for Next Month
                </h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {aiRecs.nextMonthGoals.map((goal, idx) => (
                    <div key={idx} className="p-3 bg-surface-800 rounded-xl border border-surface-700 text-xs text-slate-200 flex items-start gap-2">
                      <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md font-bold text-[10px]">G{idx + 1}</span>
                      <span>{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
