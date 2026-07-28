import { useState, useEffect } from "react";
import {
  PiggyBank, Sparkles, AlertTriangle, ArrowRight, DollarSign,
  TrendingDown, CheckCircle2, RefreshCw, Lightbulb, ShieldAlert, PlusCircle, Wallet,
} from "lucide-react";
import SectionCard from "../components/common/SectionCard";
import StatCard from "../components/common/StatCard";
import Button from "../components/common/Button";
import { formatCurrency, CATEGORY_COLORS } from "../utils/helpers";
import { getSavingsAdvice } from "../api/savingsAdvisor";
import { getExpenses, addExpense } from "../api/expenses";

export default function SavingsAdvisorPage() {
  const [incomeInput, setIncomeInput] = useState("");
  const [activeIncome, setActiveIncome] = useState(null);

  // Quick Add Expense State
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Food & Dining");
  const [addingExpense, setAddingExpense] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  // Advisory State
  const [advisorData, setAdvisorData] = useState(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [error, setError] = useState("");

  // Expense List State
  const [expenses, setExpenses] = useState([]);

  const fetchExpensesList = async () => {
    try {
      const res = await getExpenses({ limit: 20 });
      const list = res.data?.data?.expenses ?? res.data?.expenses ?? [];
      setExpenses(list);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  };

  useEffect(() => {
    fetchExpensesList();
  }, []);

  // Step 1: Submit Income & Fetch AI Advice
  const handleFetchAdvice = async (overrideIncome = null) => {
    let incVal = overrideIncome ?? Number(incomeInput);
    if (!incVal || incVal <= 0) {
      incVal = 50000;
      setIncomeInput("50000");
    }

    setError("");
    setLoadingAdvice(true);
    setActiveIncome(incVal);

    try {
      const res = await getSavingsAdvice(6, true, incVal);
      const data = res.data?.data ?? res.data ?? null;
      setAdvisorData(data);
    } catch (err) {
      console.error("Error fetching savings advice:", err);
      setError(err.response?.data?.message || "Failed to generate savings advice. Add a few expenses first.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Step 2: Quick Add Expense
  const handleAddExpense = async (e) => {
    e?.preventDefault();
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) {
      setError("Please enter a valid expense title and amount.");
      return;
    }

    setAddingExpense(true);
    setAddMsg("");
    setError("");

    try {
      await addExpense({
        title: expTitle.trim(),
        amount: Number(expAmount),
        category: expCategory,
        date: new Date().toISOString().split("T")[0],
      });

      setAddMsg(`Added "${expTitle.trim()}" (₹${expAmount}) under "${expCategory}"!`);
      setExpTitle("");
      setExpAmount("");
      await fetchExpensesList();

      // Automatically re-evaluate savings advice if income is active
      if (activeIncome) {
        await handleFetchAdvice(activeIncome);
      }
    } catch (err) {
      console.error("Add expense error:", err);
      setError(err.response?.data?.message || "Failed to add expense.");
    } finally {
      setAddingExpense(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* ── Header Banner ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <PiggyBank size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Savings Advisor Agent
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Groq AI Advisor
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Analyzes your monthly income & category spend to detect overspending in Food, Entertainment, Travel, etc.
          </p>
        </div>
      </div>

      {/* ── STEP 1: Enter Monthly Income Form ─────────────────────────────── */}
      <div className="glass rounded-3xl p-6 sm:p-8 border border-surface-700/80 shadow-2xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Wallet size={20} className="text-amber-400" />
            Step 1: Enter Your Monthly Income
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            The Savings Advisor Agent compares your category expenses against your income to calculate overspending limits.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block font-medium">Monthly Income (₹) *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50000"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <Button
            onClick={() => handleFetchAdvice()}
            loading={loadingAdvice}
            variant="primary"
            size="lg"
            className="sm:mt-5 px-8 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg"
          >
            <Sparkles size={18} />
            {loadingAdvice ? "Analyzing Savings..." : "Get AI Savings Advice"}
          </Button>
        </div>

        {error && <p className="text-rose-400 text-xs font-medium">{error}</p>}
      </div>

      {/* ── STEP 2: Quick Add Expense Details Form ────────────────────────── */}
      <div className="glass rounded-3xl p-6 border border-surface-700/80 space-y-4">
        <div>
          <h2 className="text-md font-bold text-slate-100 flex items-center gap-2">
            <PlusCircle size={18} className="text-primary-400" />
            Step 2: Add Expense Details (Food, Entertainment, Travel, etc.)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log an expense to see how it affects your monthly savings & category limits.
          </p>
        </div>

        <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Category</label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
            >
              <option value="Food & Dining">🍛 Food & Dining</option>
              <option value="Entertainment">🎬 Entertainment</option>
              <option value="Travel">✈️ Travel</option>
              <option value="Transport">🚗 Transport</option>
              <option value="Shopping">🛍️ Shopping</option>
              <option value="Housing & EMI">🏠 Housing & EMI</option>
              <option value="Bills & Utilities">💡 Bills & Utilities</option>
              <option value="Healthcare">🏥 Healthcare</option>
              <option value="Education">🎓 Education</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Expense Title *</label>
            <input
              type="text"
              placeholder="e.g. Swiggy dinner, Movie ticket"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Amount (₹) *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 500"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
            />
          </div>

          <Button
            type="submit"
            loading={addingExpense}
            variant="secondary"
            size="md"
            className="w-full rounded-xl font-bold border border-primary-500/30 text-primary-400 hover:bg-primary-500/10"
          >
            <PlusCircle size={16} />
            Add Expense
          </Button>
        </form>

        {addMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={14} />
            {addMsg}
          </div>
        )}
      </div>

      {/* ── STEP 3: AI Overspending Checks & Savings Advice ──────────────── */}
      {advisorData && (
        <div className="space-y-6 animate-fadeIn">

          {/* Overspending Warnings Banner (Food, Entertainment, Travel, etc.) */}
          {advisorData.categoryAlerts?.length > 0 ? (
            <div className="glass rounded-3xl p-6 border border-amber-500/30 bg-amber-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={22} className="text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="text-md font-bold text-amber-300">
                    Category Overspending Alerts Detected ({advisorData.categoryAlerts.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Based on your ₹{formatCurrency(advisorData.monthlyIncome)} monthly income:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {advisorData.categoryAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-surface-900/90 border border-amber-500/20 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[alert.category] || "#f59e0b" }}
                        />
                        {alert.category} Overspend
                      </span>
                      <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                        {alert.actualPct}% of Income (Rec: {alert.recommendedPct}%)
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-surface-800">
                      <span>Monthly Spend: <strong className="text-slate-200">{formatCurrency(alert.actualMonthly)}</strong></span>
                      <span>Recommended Cap: <strong className="text-emerald-400">{formatCurrency(alert.recommendedAmount)}</strong></span>
                      <span className="text-emerald-400 font-bold">Frees Up: +{formatCurrency(alert.excess)}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={18} />
              Great job! Your category spend (Food, Entertainment, Travel) is within healthy income limits.
            </div>
          )}

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Monthly Income"
              value={formatCurrency(advisorData.monthlyIncome)}
              subtitle="Declared income base"
              icon={<Wallet size={20} />}
            />
            <StatCard
              title="Potential Savings"
              value={formatCurrency(advisorData.summary?.potentialMonthlySavings || 0)}
              subtitle="Achievable monthly headroom"
              icon={<TrendingDown size={20} />}
            />
            <StatCard
              title="30-Day Money Leaks"
              value={`${advisorData.quickWins?.length || 0} Leaks`}
              subtitle="Immediate action items"
              icon={<Lightbulb size={20} />}
            />
          </div>

          {/* Immediate 30-Day Money Leaks & Action Items */}
          {advisorData.quickWins?.length > 0 && (
            <SectionCard
              title="Immediate Money Leaks to Plug (Next 30 Days)"
              subtitle="Quick wins identified by the Savings Advisor Agent"
              icon={<Lightbulb size={20} />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advisorData.quickWins.map((win, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-surface-800/80 border border-surface-700 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-100">{win.action}</h4>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        +{formatCurrency(win.estimatedSavings)}/mo
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{win.reasoning || win.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Category Reduction Roadmap */}
          {advisorData.categoryRecommendations?.length > 0 && (
            <SectionCard
              title="Category Spending & Reduction Roadmap"
              subtitle="Recommended budget target adjustments based on income ratios"
              icon={<PiggyBank size={20} />}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-700 text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3 font-semibold">Category</th>
                      <th className="pb-3 px-3 font-semibold text-right">Current Monthly</th>
                      <th className="pb-3 px-3 font-semibold text-right">Target Cap</th>
                      <th className="pb-3 px-3 font-semibold text-right">Monthly Savings</th>
                      <th className="pb-3 px-3 font-semibold">AI Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/50">
                    {advisorData.categoryRecommendations.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-surface-800/40">
                        <td className="py-3 px-3 font-bold text-slate-200">{rec.category}</td>
                        <td className="py-3 px-3 text-right text-slate-300">{formatCurrency(rec.currentSpend)}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">{formatCurrency(rec.targetSpend)}</td>
                        <td className="py-3 px-3 text-right font-bold text-amber-400">
                          +{formatCurrency(Math.max(0, rec.currentSpend - rec.targetSpend))}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px] leading-relaxed max-w-xs">
                          {rec.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

        </div>
      )}

      {/* Recent Logged Expenses Table */}
      <SectionCard
        title="Your Logged Expense Records"
        subtitle="Current expenses analyzed by the Savings Advisor Agent"
        icon={<Wallet size={20} />}
      >
        {expenses.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No expenses logged yet. Add expenses above to run the Savings Advisor Agent!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-700 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3 font-semibold">Date</th>
                  <th className="pb-3 px-3 font-semibold">Title</th>
                  <th className="pb-3 px-3 font-semibold text-right">Amount (₹)</th>
                  <th className="pb-3 px-3 font-semibold text-center">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {expenses.map((exp) => {
                  const catColor = CATEGORY_COLORS[exp.category] || "#6366f1";
                  return (
                    <tr key={exp._id} className="hover:bg-surface-800/40">
                      <td className="py-3 px-3 text-slate-400">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 font-semibold text-slate-100">{exp.title}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-200">{formatCurrency(exp.amount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1"
                          style={{
                            color: catColor,
                            backgroundColor: `${catColor}15`,
                            borderColor: `${catColor}30`,
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

    </div>
  );
}
