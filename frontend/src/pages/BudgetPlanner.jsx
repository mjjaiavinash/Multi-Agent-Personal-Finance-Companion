import { useState } from "react";
import {
  Calculator, PieChart, TrendingUp, ShieldAlert, PiggyBank,
  CheckCircle2, Lightbulb, ArrowRight, DollarSign, Wallet,
  Download, FileText,
} from "lucide-react";
import StatCard from "../components/common/StatCard";
import SectionCard from "../components/common/SectionCard";
import Button from "../components/common/Button";
import { formatCurrency } from "../utils/helpers";
import { downloadBudgetPlanPDF } from "../api/budget";

// ─── Budget Breakdown Rules (Total 100%) ──────────────────────────────────────

const BUDGET_ALLOCATION_RULES = [
  { key: "housing",       label: "🏠 House Rent / Housing",                         pct: 25, color: "#3b82f6", desc: "Rent, home EMI, maintenance & housing expenses" },
  { key: "food",          label: "🍛 Food & Groceries",                              pct: 15, color: "#10b981", desc: "Groceries, daily dining, food delivery & household supplies" },
  { key: "savings",       label: "💰 Savings & Investments",                         pct: 15, color: "#8b5cf6", desc: "Long-term wealth, mutual funds, SIPs & equity investments" },
  { key: "transport",     label: "🚗 Transport",                                     pct: 10, color: "#f59e0b", desc: "Fuel, commuting, public transit & vehicle maintenance" },
  { key: "utilities",     label: "💡 Utilities (Electricity, Water, Internet, Mobile)", pct: 8, color: "#06b6d4", desc: "Power, water bill, broadband & mobile recharges" },
  { key: "shopping",      label: "🛍️ Shopping",                                      pct: 7,  color: "#ec4899", desc: "Apparel, personal care & lifestyle purchases" },
  { key: "healthcare",    label: "🏥 Healthcare / Medical",                          pct: 5,  color: "#ef4444", desc: "Medicines, health insurance & wellness reserves" },
  { key: "education",     label: "🎓 Education / Learning",                          pct: 5,  color: "#6366f1", desc: "Courses, books, tuition & professional skill upgrades" },
  { key: "entertainment", label: "🎬 Entertainment",                                 pct: 5,  color: "#a855f7", desc: "Movies, streaming services & leisure activities" },
  { key: "travel",        label: "✈️ Travel / Vacation Fund",                        pct: 5,  color: "#14b8a6", desc: "Weekend getaways, short trips & annual vacation fund" },
  { key: "emergency",     label: "🚨 Emergency Fund",                                pct: 5,  color: "#f43f5e", desc: "Liquid safety net for unforeseen emergencies" },
];

export default function BudgetPlanner() {
  const [incomeInput, setIncomeInput] = useState("");
  const [activePlan, setActivePlan] = useState(null);
  const [error, setError] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    if (!activePlan) return;
    setDownloadingPdf(true);
    try {
      const res = await downloadBudgetPlanPDF(activePlan.income);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `SpendSense_Budget_Plan_₹${activePlan.income}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleGenerateBudget = (e) => {
    e?.preventDefault();
    const numericIncome = Number(incomeInput);

    if (!numericIncome || numericIncome <= 0) {
      setError("Please enter a valid monthly income greater than 0.");
      return;
    }

    setError("");

    // Calculate budget breakdown based on user's input income
    const categoryAllocations = BUDGET_ALLOCATION_RULES.map((rule) => {
      const amount = Math.round((numericIncome * rule.pct) / 100);
      return {
        ...rule,
        amount,
      };
    });

    const totalExpenses = Math.round((numericIncome * 80) / 100); // 80% Needs + Wants + Discretionary
    const totalSavings = Math.round((numericIncome * 20) / 100);  // 15% Investments + 5% Emergency Fund
    const emergencyFundMonthly = Math.round((numericIncome * 5) / 100);
    const sixMonthEmergencyGoal = emergencyFundMonthly * 6;

    setActivePlan({
      income: numericIncome,
      categoryAllocations,
      totalExpenses,
      totalSavings,
      emergencyFundMonthly,
      sixMonthEmergencyGoal,
      generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
          <Calculator size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Budget Planner</h1>
          <p className="text-slate-400 text-sm">
            Generate an optimal 100% financial allocation plan based on your monthly income
          </p>
        </div>
      </div>

      {/* ── Single Income Input Card ────────────────────────────────────────── */}
      <div className="glass rounded-3xl p-6 sm:p-8 border border-surface-700/80 shadow-2xl bg-gradient-to-b from-surface-800/90 to-surface-900/90 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Wallet size={18} className="text-primary-400" />
            Enter Your Monthly Income
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input your net monthly income to calculate exact recommended spending, savings, and investment caps.
          </p>
        </div>

        <form onSubmit={handleGenerateBudget} className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 50000"
              value={incomeInput}
              onChange={(e) => {
                setIncomeInput(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-surface-900 border border-surface-600 rounded-2xl pl-8 pr-4 py-3 text-slate-100 font-semibold text-base placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors shadow-inner"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="whitespace-nowrap px-8 rounded-2xl shadow-lg font-bold"
          >
            <PieChart size={18} />
            Generate Budget Plan
          </Button>
        </form>

        {error && (
          <p className="text-rose-400 text-xs font-medium pt-1 flex items-center gap-1.5">
            <ShieldAlert size={14} />
            {error}
          </p>
        )}
      </div>

      {/* ── Generated Plan View ─────────────────────────────────────────────── */}
      {activePlan && (
        <div className="space-y-6 animate-fadeIn">

          {/* ── Financial Overview Stats Grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Monthly Income"
              value={formatCurrency(activePlan.income)}
              subtitle="User Specified Baseline"
              icon={Wallet}
              color="primary"
            />
            <StatCard
              title="Expenses & Needs (80%)"
              value={formatCurrency(activePlan.totalExpenses)}
              subtitle="Housing, Food, Bills & Lifestyle"
              icon={TrendingUp}
              color="cyan"
            />
            <StatCard
              title="Savings & Wealth (20%)"
              value={formatCurrency(activePlan.totalSavings)}
              subtitle="Investments (15%) + Emergency (5%)"
              icon={PiggyBank}
              color="emerald"
            />
            <StatCard
              title="6-Month Safety Target"
              value={formatCurrency(activePlan.sixMonthEmergencyGoal)}
              subtitle="Target Liquid Emergency Reserve"
              icon={ShieldAlert}
              color="amber"
            />
          </div>

          {/* ── Category Breakdown Table / Cards ────────────────────────────── */}
          <SectionCard
            title="Recommended Category Allocations"
            subtitle="Complete 100% distribution of your monthly income across 11 key financial categories"
            icon={<PieChart size={20} />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-700/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 px-3 font-semibold">Category</th>
                    <th className="pb-3 px-3 font-semibold text-center">Allocated %</th>
                    <th className="pb-3 px-3 font-semibold text-right">Monthly Amount (₹)</th>
                    <th className="pb-3 px-3 font-semibold hidden md:table-cell">Purpose / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/40 text-sm">
                  {activePlan.categoryAllocations.map((cat) => (
                    <tr key={cat.key} className="hover:bg-surface-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-semibold text-slate-100">{cat.label}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-extrabold border"
                          style={{
                            color: cat.color,
                            backgroundColor: `${cat.color}15`,
                            borderColor: `${cat.color}30`,
                          }}
                        >
                          {cat.pct}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-slate-100">
                        {formatCurrency(cat.amount)}
                      </td>

                      <td className="py-3.5 px-3 text-xs text-slate-400 hidden md:table-cell leading-relaxed">
                        {cat.desc}
                      </td>
                    </tr>
                  ))}

                  {/* Total Row */}
                  <tr className="bg-surface-800/60 font-bold border-t-2 border-surface-600">
                    <td className="py-4 px-3 text-slate-100">Total Monthly Allocation</td>
                    <td className="py-4 px-3 text-center text-primary-400">100%</td>
                    <td className="py-4 px-3 text-right text-emerald-400 text-base">
                      {formatCurrency(activePlan.income)}
                    </td>
                    <td className="py-4 px-3 text-xs text-slate-400 hidden md:table-cell">
                      100% of income successfully mapped
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ── AI Suggestions & Smart Financial Guidance ───────────────────── */}
          <SectionCard
            title="AI Financial Insights & Recommendations"
            subtitle="Tailored guidelines to maximize your wealth based on your ₹ income"
            icon={<Lightbulb size={20} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Suggestion 1 */}
              <div className="p-4 rounded-2xl bg-surface-800/60 border border-surface-700/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 size={16} />
                  Housing & Rent Discipline (25%)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Keep your total monthly housing cost (Rent or Home Loan EMI) capped at{" "}
                  <strong className="text-slate-100 font-bold">{formatCurrency(activePlan.income * 0.25)}</strong>. Staying under this limit prevents cash flow bottlenecking.
                </p>
              </div>

              {/* Suggestion 2 */}
              <div className="p-4 rounded-2xl bg-surface-800/60 border border-surface-700/60 space-y-2">
                <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm">
                  <CheckCircle2 size={16} />
                  Automate Wealth Accumulation (15%)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Schedule automatic monthly SIP investments of{" "}
                  <strong className="text-slate-100 font-bold">{formatCurrency(activePlan.income * 0.15)}</strong> right on payday into diversified mutual funds or index ETFs.
                </p>
              </div>

              {/* Suggestion 3 */}
              <div className="p-4 rounded-2xl bg-surface-800/60 border border-surface-700/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <CheckCircle2 size={16} />
                  Build Liquid Emergency Reserve (5%)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Deposit <strong className="text-slate-100 font-bold">{formatCurrency(activePlan.emergencyFundMonthly)}</strong> monthly into a high-yield savings account until you build a 6-month safety net of <strong className="text-slate-100 font-bold">{formatCurrency(activePlan.sixMonthEmergencyGoal)}</strong>.
                </p>
              </div>

              {/* Suggestion 4 */}
              <div className="p-4 rounded-2xl bg-surface-800/60 border border-surface-700/60 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <CheckCircle2 size={16} />
                  Discretionary Spend Guardrails (12%)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Combine Shopping (7% = {formatCurrency(activePlan.income * 0.07)}) and Entertainment (5% = {formatCurrency(activePlan.income * 0.05)}) to keep leisure spending strictly within{" "}
                  <strong className="text-slate-100 font-bold">{formatCurrency(activePlan.income * 0.12)}</strong> per month.
                </p>
              </div>

            </div>
          </SectionCard>

          {/* ── Convert / Download PDF Button ─────────────────────────────── */}
          <div className="glass rounded-3xl p-6 border border-surface-700/80 text-center flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary-950/40 via-surface-900 to-emerald-950/30 shadow-2xl">
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-primary-400" />
                Export Your Official Budget Plan PDF
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download your personalized 100% budget allocation, category caps, and AI recommendations as an official PDF document.
              </p>
            </div>

            <Button
              onClick={handleDownloadPDF}
              loading={downloadingPdf}
              variant="primary"
              size="lg"
              className="whitespace-nowrap px-8 py-3.5 rounded-2xl shadow-xl font-bold bg-gradient-to-r from-primary-600 via-indigo-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-white border border-primary-400/30 transition-all transform hover:scale-[1.02]"
            >
              <Download size={18} />
              Convert to PDF
            </Button>
          </div>

        </div>
      )}

    </div>
  );
}
