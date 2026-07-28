import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Color config per grade ───────────────────────────────────────────────────
const GRADE_CONFIG = {
  Excellent: { color: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", ring: "#10b981" },
  Good:      { color: "#3b82f6", bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30",    ring: "#3b82f6" },
  Average:   { color: "#f59e0b", bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",   ring: "#f59e0b" },
  Poor:      { color: "#ef4444", bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/30",    ring: "#ef4444" },
};

// ─── Animated SVG ring ────────────────────────────────────────────────────────
function CircularProgress({ score, grade }) {
  const circleRef = useRef(null);
  const cfg       = GRADE_CONFIG[grade] || GRADE_CONFIG.Average;

  const radius      = 54;
  const circumference = 2 * Math.PI * radius;
  const targetOffset  = circumference - (score / 100) * circumference;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start from full offset (empty), animate to target
    el.style.strokeDashoffset = String(circumference);
    const raf = requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.strokeDashoffset = String(targetOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [score, targetOffset, circumference]);

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        {/* Track */}
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        {/* Progress */}
        <circle
          ref={circleRef}
          cx="72" cy="72" r={radius}
          fill="none"
          stroke={cfg.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 8px ${cfg.ring}60)` }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${cfg.text}`}>{score}</span>
        <span className="text-xs text-slate-500 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ─── Component bars ───────────────────────────────────────────────────────────
function ComponentBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export default function HealthScoreCard({ healthScore }) {
  if (!healthScore) return null;

  const { score, grade, components } = healthScore;
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.Average;

  const bars = [
    { label: "Savings Rate",         value: components?.savingsRate         || 0 },
    { label: "Budget Adherence",     value: components?.budgetAdherence     || 0 },
    { label: "Spending Consistency", value: components?.spendingConsistency || 0 },
    { label: "Expense / Income",     value: components?.expenseToIncome     || 0 },
  ];

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
        <div className="flex items-center gap-2.5">
          <span className="text-primary-400"><Activity size={18} /></span>
          <p className="text-base font-semibold text-slate-100">Financial Health Score</p>
        </div>
        <Link
          to="/health-score"
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          View details →
        </Link>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-6">
          {/* Ring */}
          <CircularProgress score={score} grade={grade} />

          {/* Right side */}
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mb-3 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {grade}
            </div>

            <div className="space-y-2.5">
              {bars.map((b) => (
                <ComponentBar key={b.label} label={b.label} value={b.value} color={cfg.color} />
              ))}
            </div>
          </div>
        </div>

        {/* Reason snippet */}
        {healthScore.ai?.reason && (
          <p className="mt-4 text-xs text-slate-400 leading-relaxed border-l-2 border-primary-500/30 pl-3">
            {healthScore.ai.reason}
          </p>
        )}
      </div>
    </div>
  );
}
