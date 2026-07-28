import React, { useState, useEffect } from "react";
import {
  Tag, TrendingUp, PiggyBank, Target, BrainCircuit,
  CheckCircle2, Loader2, Sparkles, Clock
} from "lucide-react";

const AGENTS = [
  {
    id: "categorizer",
    name: "Expense Categorizer",
    icon: Tag,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    activeGlow: "shadow-violet-500/20",
    statusText: "Grouping transactions into categories & tagging patterns...",
  },
  {
    id: "analyzer",
    name: "Pattern Analyzer",
    icon: TrendingUp,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    activeGlow: "shadow-indigo-500/20",
    statusText: "Analyzing velocity trends, recurring spikes & spending anomalies...",
  },
  {
    id: "savings",
    name: "Savings Advisor",
    icon: PiggyBank,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    activeGlow: "shadow-emerald-500/20",
    statusText: "Formulating high-impact cost-cutting & wealth opportunities...",
  },
  {
    id: "budget",
    name: "Budget Planner",
    icon: Target,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    activeGlow: "shadow-amber-500/20",
    statusText: "Constructing target 50/30/20 budget allocations & caps...",
  },
  {
    id: "assistant",
    name: "Finance Assistant",
    icon: BrainCircuit,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    activeGlow: "shadow-cyan-500/20",
    statusText: "Synthesizing overall executive financial summary...",
  },
];

export default function AIPipelineLoader({ onFinish }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const finishTimerRef = React.useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < AGENTS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          if (onFinish) {
            finishTimerRef.current = setTimeout(onFinish, 400);
          }
          return prev;
        }
      });
    }, 700);

    return () => {
      clearInterval(interval);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  // onFinish is intentionally excluded — we only want this to run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPercent = Math.min(100, Math.round(((currentStepIndex + 1) / AGENTS.length) * 100));
  const activeAgent = AGENTS[currentStepIndex];

  return (
    <div className="max-w-2xl mx-auto my-12 bg-surface-800/80 border border-surface-700/70 p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden">
      {/* Background Subtle Gradient Wave */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-700/50 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-spin" /> AI Multi-Agent Pipeline
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            Orchestrating Financial Analysis...
          </h2>
          <p className="text-xs text-slate-400">
            Current Stage: <strong className="text-indigo-300 font-semibold">{activeAgent?.name}</strong>
          </p>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface-900/90 border border-surface-700 self-start sm:self-auto">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pipeline Progress</div>
            <div className="text-sm font-extrabold text-slate-100">{progressPercent}%</div>
          </div>
        </div>
      </div>

      {/* Global Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-surface-900 rounded-full overflow-hidden p-0.5 border border-surface-700/60">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Agents Stepper List */}
      <div className="space-y-3 pt-2">
        {AGENTS.map((agent, index) => {
          const isDone = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;
          const Icon = agent.icon;

          return (
            <div
              key={agent.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                isDone
                  ? "bg-surface-900/60 border-emerald-500/30 text-slate-200"
                  : isCurrent
                  ? `bg-surface-900/90 ${agent.border} shadow-lg ${agent.activeGlow} ring-1 ring-indigo-500/30`
                  : "bg-surface-900/30 border-surface-700/40 text-slate-500 opacity-60"
              }`}
            >
              {/* Left Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`p-2.5 rounded-xl border flex-shrink-0 transition-transform ${
                    isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : isCurrent
                      ? `${agent.bg} ${agent.border} ${agent.color} scale-110`
                      : "bg-surface-800 border-surface-700 text-slate-500"
                  }`}
                >
                  <Icon size={18} className={isCurrent ? "animate-bounce" : ""} />
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold truncate ${
                        isDone
                          ? "text-slate-100"
                          : isCurrent
                          ? "text-slate-100"
                          : "text-slate-400"
                      }`}
                    >
                      {agent.name}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate">
                    {isCurrent ? agent.statusText : isDone ? "Stage execution completed" : "Queued in pipeline"}
                  </p>
                </div>
              </div>

              {/* Right Status Badge */}
              <div className="flex-shrink-0 pl-3">
                {isDone && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm animate-fadeIn">
                    <CheckCircle2 size={15} />
                    <span>✓ Completed</span>
                  </span>
                )}

                {isCurrent && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm">
                    <Loader2 size={15} className="animate-spin text-indigo-400" />
                    <span>Processing...</span>
                  </span>
                )}

                {isPending && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-800 text-slate-500 border border-surface-700">
                    <Clock size={13} />
                    <span>Pending</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
