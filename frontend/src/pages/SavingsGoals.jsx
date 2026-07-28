import React, { useState, useEffect, useCallback } from "react";
import {
  Target, Plus, Sparkles, Trophy, Calendar, CheckCircle2,
  Trash2, TrendingUp, IndianRupee, Layers, Zap, X,
  PiggyBank, PartyPopper, ChevronRight, Clock, AlertCircle
} from "lucide-react";
import {
  getSavingsGoals,
  createSavingsGoal,
  addSavingsGoalFunds,
  deleteSavingsGoal,
  getSavingsGoalAISuggestions
} from "../api/savingsGoal";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import ErrorBanner from "../components/common/ErrorBanner";

const CATEGORY_OPTIONS = [
  "General", "Emergency Fund", "Vacation", "Gadget", "Vehicle", "Home", "Investment", "Education", "Other"
];

// Circular SVG Progress Ring component
function CircularProgress({ percentage, size = 80, strokeWidth = 8, color = "#6366f1" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#334155"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-sm font-extrabold text-slate-100">{percentage}%</span>
      </div>
    </div>
  );
}

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: "",
    targetAmount: "",
    currentSavings: "",
    deadline: "",
    category: "General"
  });
  const [fundsInput, setFundsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiLoadingGoalId, setAiLoadingGoalId] = useState(null);

  const fetchGoals = useCallback(async () => {
    setError(null);
    try {
      const res = await getSavingsGoals();
      if (res.data?.success) {
        setGoals(res.data.goals || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load savings goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.targetAmount || !createForm.deadline) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await createSavingsGoal(createForm);
      setShowCreateModal(false);
      setCreateForm({ title: "", targetAmount: "", currentSavings: "", deadline: "", category: "General" });
      fetchGoals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFundsSubmit = async (e) => {
    e.preventDefault();
    if (!fundsInput || Number(fundsInput) <= 0 || !activeGoal) return;
    setSubmitting(true);
    try {
      await addSavingsGoalFunds(activeGoal._id, fundsInput);
      setShowAddFundsModal(false);
      setFundsInput("");
      setActiveGoal(null);
      fetchGoals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add funds.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm("Are you sure you want to delete this savings goal?")) return;
    try {
      await deleteSavingsGoal(id);
      fetchGoals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete goal.");
    }
  };

  const handleFetchAISuggestions = async (goalId) => {
    setAiLoadingGoalId(goalId);
    try {
      await getSavingsGoalAISuggestions(goalId);
      fetchGoals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate AI suggestions.");
    } finally {
      setAiLoadingGoalId(null);
    }
  };

  // Aggregated Stats
  const totalGoals = goals.length;
  const totalTarget = goals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((acc, g) => acc + (g.currentSavings || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const completedGoalsCount = goals.filter((g) => g.progressPercentage >= 100 || g.status === "completed").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* ── 1. Top Header & Primary Action ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface-800/80 border border-surface-700/60 p-6 rounded-3xl shadow-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <PiggyBank size={13} /> Wealth Accumulation Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            <Target className="text-emerald-400" size={32} />
            Savings Goal Tracker
          </h1>
          <p className="text-slate-400 text-sm">
            Set target savings goals, deposit funds, track real-time progress, celebrate completions, and get AI tips.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowCreateModal(true)}
          className="shadow-lg shadow-primary-600/30 self-start lg:self-auto"
        >
          <Plus size={18} />
          Create New Goal
        </Button>
      </div>

      <ErrorBanner message={error} />

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-800/40 border border-surface-700/50 rounded-3xl backdrop-blur-md">
          <Loader size="lg" />
          <p className="mt-4 text-slate-300 font-semibold animate-pulse">Loading savings goals...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── 2. Overall Overview Stats Bar ───────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Active Goals</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/10 text-primary-400">
                  {completedGoalsCount} Done 🎉
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100">
                {totalGoals}
              </div>
              <div className="text-xs text-slate-400 mt-2">Target savings goals tracked</div>
            </div>

            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Total Target Savings</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <IndianRupee size={16} />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100">
                ₹{totalTarget.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-2">Cumulative financial targets</div>
            </div>

            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Total Saved So Far</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <PiggyBank size={16} />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-emerald-400">
                ₹{totalSaved.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-2">Deposited toward goals</div>
            </div>

            <div className="bg-surface-800/80 border border-surface-700/60 p-5 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
                <span>Overall Completion</span>
                <span className="text-xs font-bold text-slate-200">{overallPercentage}%</span>
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-indigo-400">
                {overallPercentage}%
              </div>
              <div className="h-2 w-full bg-surface-900 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Empty State */}
          {goals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-800/40 border border-surface-700/50 rounded-3xl text-center px-6">
              <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 mb-4">
                <Target size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-100">No Savings Goals Set Yet</h3>
              <p className="text-slate-400 text-sm max-w-md mt-2 mb-6">
                Create your first savings goal (e.g. Vacation, Emergency Fund, Gadget) to start tracking progress.
              </p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={18} /> Create Your First Goal
              </Button>
            </div>
          )}

          {/* ── 3. Savings Goals Cards Grid ─────────────────────────────────── */}
          {goals.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {goals.map((goal) => {
                const isCompleted = (goal.progressPercentage >= 100 || goal.status === "completed");
                const progressPct = goal.progressPercentage || 0;

                return (
                  <div
                    key={goal._id}
                    className={`bg-surface-800/80 border p-6 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden transition-all space-y-6 ${
                      isCompleted
                        ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/20 via-surface-800 to-surface-800"
                        : "border-surface-700/60 hover:border-surface-600"
                    }`}
                  >
                    {/* ── Celebration Banner Animation when Completed ─────────── */}
                    {isCompleted && (
                      <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between text-emerald-300 shadow-lg animate-pulse">
                        <div className="flex items-center gap-2 font-extrabold text-sm">
                          <PartyPopper size={20} className="text-amber-400 animate-bounce" />
                          <span>Goal Achieved! Congratulations! 🎉</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-surface-900">
                          100% COMPLETE
                        </span>
                      </div>
                    )}

                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-surface-700 text-slate-300">
                            {goal.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted ? "bg-emerald-500/10 text-emerald-400" : "bg-primary-500/10 text-primary-400"
                          }`}>
                            {isCompleted ? "Completed" : "In Progress"}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 mt-2">{goal.title}</h3>
                      </div>

                      {/* Circular Progress Ring */}
                      <CircularProgress
                        percentage={progressPct}
                        color={isCompleted ? "#10b981" : "#6366f1"}
                      />
                    </div>

                    {/* Savings Numbers */}
                    <div className="grid grid-cols-2 gap-4 bg-surface-900/60 p-4 rounded-2xl border border-surface-700/50">
                      <div>
                        <span className="text-xs text-slate-400">Current Savings</span>
                        <div className="text-xl font-extrabold text-emerald-400">
                          ₹{(goal.currentSavings || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Target Goal</span>
                        <div className="text-xl font-extrabold text-slate-100">
                          ₹{(goal.targetAmount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Linear Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-400">
                        <span>Progress Bar</span>
                        <span className="font-bold text-slate-200">{progressPct}%</span>
                      </div>
                      <div className="h-3 w-full bg-surface-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-primary-500"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Dates Info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-surface-700/50 pt-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <span>Deadline: <strong className="text-slate-200">{new Date(goal.deadline).toLocaleDateString()}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        <span>Est. Completion: <strong className="text-indigo-400">{goal.estimatedCompletionDate}</strong></span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        {!isCompleted && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setActiveGoal(goal);
                              setShowAddFundsModal(true);
                            }}
                          >
                            <IndianRupee size={14} /> Add Funds
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFetchAISuggestions(goal._id)}
                          loading={aiLoadingGoalId === goal._id}
                          className="border-indigo-500/30 text-indigo-300"
                        >
                          <Sparkles size={14} /> AI Suggestions
                        </Button>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(goal._id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* ── AI Suggestions Box (if present) ──────────────────── */}
                    {goal.aiSuggestions && goal.aiSuggestions.length > 0 && (
                      <div className="bg-surface-900/80 border border-indigo-500/20 p-4 rounded-2xl space-y-3 pt-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                          <Zap size={14} /> Groq AI Acceleration Suggestions
                        </div>
                        <div className="space-y-2">
                          {goal.aiSuggestions.map((sug, idx) => (
                            <div key={idx} className="p-2.5 bg-surface-800 rounded-xl text-xs space-y-1">
                              <div className="font-bold text-slate-200 flex items-center justify-between">
                                <span>{sug.title}</span>
                                {sug.potentialSavingsPerMonth > 0 && (
                                  <span className="text-emerald-400 text-[11px]">+₹{sug.potentialSavingsPerMonth}/mo</span>
                                )}
                              </div>
                              <p className="text-slate-300">{sug.action}</p>
                              {sug.acceleratedCompletionDate && (
                                <span className="text-[10px] text-amber-400 font-semibold block">
                                  ⚡ Complete {sug.acceleratedCompletionDate}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modal: Create Savings Goal ───────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Target size={22} className="text-emerald-400" />
                Create Savings Goal
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Laptop, Emergency Fund"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50000"
                    value={createForm.targetAmount}
                    onChange={(e) => setCreateForm({ ...createForm, targetAmount: e.target.value })}
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Current Savings (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10000"
                    value={createForm.currentSavings}
                    onChange={(e) => setCreateForm({ ...createForm, currentSavings: e.target.value })}
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Deadline *</label>
                  <input
                    type="date"
                    required
                    value={createForm.deadline}
                    onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500 cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Create Goal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Funds ─────────────────────────────────────────────────── */}
      {showAddFundsModal && activeGoal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-800 border border-surface-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <IndianRupee size={22} className="text-emerald-400" />
                Deposit Funds to "{activeGoal.title}"
              </h3>
              <button
                onClick={() => {
                  setShowAddFundsModal(false);
                  setActiveGoal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddFundsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deposit Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 2000"
                  value={fundsInput}
                  onChange={(e) => setFundsInput(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddFundsModal(false);
                    setActiveGoal(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Deposit Funds
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
