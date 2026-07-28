import { useState, useEffect, useCallback } from "react";
import {
  Activity, RefreshCw, TrendingUp, AlertTriangle,
  CheckCircle2, Lightbulb, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  computeHealthScore,
  getLatestHealthScore,
  getHealthScoreHistory,
} from "../api/healthScore";
import Loader  from "../components/common/Loader";
import { formatCurrency } from "../utils/helpers";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADE_CONFIG = {
  Excellent: { color: "#10b981", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", emoji: "🏆" },
  Good:      { color: "#3b82f6", text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    emoji: "👍" },
  Average:   { color: "#f59e0b", text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   emoji: "📊" },
  Poor:      { color: "#ef4444", text: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    emoji: "⚠️" },
};

const COMPONENT_LABELS = {
  savingsRate:         "Savings Rate",
  budgetAdherence:     "Budget Adherence",
  spendingConsistency: "Spending Consistency",
  expenseToIncome:     "Expense / Income Ratio",
  debtRatio:           "Debt Ratio",
};

// ─── Animated ring ────────────────────────────────────────────────────────────
function BigRing({ score, grade }) {
  const cfg         = GRADE_CONFIG[grade] || GRADE_CONFIG.Average;
  const radius      = 80;
  const circ        = 2 * Math.PI * radius;
  const offset      = circ - (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-52 h-52 mx-auto">
      <svg width="208" height="208" viewBox="0 0 208 208" className="-rotate-90">
        <circle cx="104" cy="104" r={radius} fill="none" stroke="#1e293b" strokeWidth="14" />
        <circle
          cx="104" cy="104" r={radius}
          fill="none"
          stroke={cfg.color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 12px ${cfg.color}70)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-5xl">{cfg.emoji}</span>
        <span className={`text-4xl font-black ${cfg.text}`}>{score}</span>
        <span className="text-sm text-slate-500">out of 100</span>
      </div>
    </div>
  );
}

// ─── Component breakdown bar ──────────────────────────────────────────────────
function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-400 w-44 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-300 w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Collapsible list section ─────────────────────────────────────────────────
function ListSection({ icon, title, items, colorClass, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items?.length) return null;
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-surface-700/50 hover:bg-surface-700/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={colorClass}>{icon}</span>
          <p className="text-base font-semibold text-slate-100">{title}</p>
          <span className="text-xs text-slate-500 bg-surface-700 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && (
        <ul className="p-6 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className={`mt-0.5 shrink-0 ${colorClass}`}>•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── History tooltip ──────────────────────────────────────────────────────────
function HistoryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const grade = payload[0]?.payload?.grade;
  const cfg   = GRADE_CONFIG[grade] || GRADE_CONFIG.Average;
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${cfg.text}`}>{payload[0].value} — {grade}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HealthScorePage() {
  const [healthScore, setHealthScore] = useState(null);
  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [computing,   setComputing]   = useState(false);
  const [error,       setError]       = useState("");

  const [income,  setIncome]  = useState("");
  const [budget,  setBudget]  = useState("");
  const [showForm, setShowForm] = useState(false);

  // ── Load latest + history on mount ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, histRes] = await Promise.all([
        getLatestHealthScore(),
        getHealthScoreHistory(10),
      ]);
      const hs = latestRes.data?.data?.healthScore;
      setHealthScore(hs || null);
      if (!hs) setShowForm(true); // first time — show form immediately

      const raw = histRes.data?.data?.history || [];
      setHistory(
        raw.reverse().map((h) => ({
          date:  new Date(h.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          score: h.score,
          grade: h.grade,
        }))
      );
    } catch {
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Compute ─────────────────────────────────────────────────────────────────
  const handleCompute = async (e) => {
    e.preventDefault();
    if (!income || isNaN(Number(income)) || Number(income) <= 0) {
      setError("Please enter a valid monthly income.");
      return;
    }
    setError("");
    setComputing(true);
    try {
      const res = await computeHealthScore(Number(income), Number(budget) || 0);
      const hs  = res.data?.data?.healthScore;
      setHealthScore(hs);
      setShowForm(false);
      // Refresh history
      const histRes = await getHealthScoreHistory(10);
      const raw = histRes.data?.data?.history || [];
      setHistory(
        raw.reverse().map((h) => ({
          date:  new Date(h.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          score: h.score,
          grade: h.grade,
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to compute score. Try again.");
    } finally {
      setComputing(false);
    }
  };

  if (loading) return <Loader />;

  const cfg = healthScore ? (GRADE_CONFIG[healthScore.grade] || GRADE_CONFIG.Average) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity size={24} className="text-primary-400" />
            Financial Health Score
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">AI-powered analysis of your financial wellbeing</p>
        </div>
        <div className="flex gap-2">
          {healthScore && (
            <button
              onClick={() => setShowForm((p) => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-slate-400 hover:text-slate-100 text-sm transition-all"
            >
              <RefreshCw size={14} />
              Recompute
            </button>
          )}
        </div>
      </div>

      {/* ── Input form ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass rounded-2xl p-6">
          <p className="text-base font-semibold text-slate-100 mb-4">
            {healthScore ? "Recompute Your Score" : "Compute Your Health Score"}
          </p>
          <form onSubmit={handleCompute} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Monthly Income (₹) *</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 50000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Monthly Budget (₹) — optional</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 40000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-surface-700 border border-surface-600 rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={computing}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {computing ? <><RefreshCw size={14} className="animate-spin" /> Computing…</> : "Compute Score"}
              </button>
            </div>
          </form>
          {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
        </div>
      )}

      {/* ── Score display ───────────────────────────────────────────────────── */}
      {healthScore && (
        <>
          {/* Big ring + grade */}
          <div className="glass rounded-2xl p-8">
            <BigRing score={healthScore.score} grade={healthScore.grade} />
            <div className="text-center mt-4">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {healthScore.grade}
              </span>
              {healthScore.ai?.reason && (
                <p className="text-slate-400 text-sm mt-3 max-w-lg mx-auto leading-relaxed">
                  {healthScore.ai.reason}
                </p>
              )}
            </div>
          </div>

          {/* Component breakdown */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-700/50">
              <p className="text-base font-semibold text-slate-100">Score Breakdown</p>
              <p className="text-xs text-slate-500 mt-0.5">How each factor contributes to your score</p>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={healthScore.components?.[key] ?? 0}
                  color={cfg.color}
                />
              ))}
            </div>
            {/* Inputs used */}
            <div className="px-6 pb-5 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Income: <span className="text-slate-300">{formatCurrency(healthScore.inputs?.monthlyIncome || 0)}/mo</span></span>
              <span>Expenses: <span className="text-slate-300">{formatCurrency(healthScore.inputs?.totalExpenses || 0)}/mo</span></span>
              {healthScore.inputs?.monthlyBudget > 0 && (
                <span>Budget: <span className="text-slate-300">{formatCurrency(healthScore.inputs.monthlyBudget)}/mo</span></span>
              )}
              <span>Data: <span className="text-slate-300">{healthScore.inputs?.monthsAnalyzed || 1} month(s)</span></span>
            </div>
          </div>

          {/* AI sections */}
          <div className="space-y-4">
            <ListSection
              icon={<Lightbulb size={18} />}
              title="Improvement Suggestions"
              items={healthScore.ai?.improvementSuggestions}
              colorClass="text-amber-400"
              defaultOpen={true}
            />
            <ListSection
              icon={<CheckCircle2 size={18} />}
              title="Positive Habits"
              items={healthScore.ai?.positiveHabits}
              colorClass="text-emerald-400"
              defaultOpen={true}
            />
            <ListSection
              icon={<AlertTriangle size={18} />}
              title="Risk Factors"
              items={healthScore.ai?.riskFactors}
              colorClass="text-rose-400"
              defaultOpen={true}
            />
          </div>

          {/* History chart */}
          {history.length > 1 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-700/50">
                <p className="text-base font-semibold text-slate-100">Score History</p>
                <p className="text-xs text-slate-500 mt-0.5">Your financial health over time</p>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<HistoryTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ fill: "#8b5cf6", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#8b5cf6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
