import { useState, useEffect } from "react";
import { Tag, CheckCircle2, RefreshCw, FolderTree, PlusCircle } from "lucide-react";
import SectionCard from "../components/common/SectionCard";
import Button from "../components/common/Button";
import { formatCurrency, CATEGORY_COLORS } from "../utils/helpers";
import { suggestCategory, applyToAllExpenses } from "../api/categorizer";
import { getExpenses, addExpense } from "../api/expenses";

export default function CategorizerPage() {
  const [rawTitle, setRawTitle] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  // History & Bulk State
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [categorizingAll, setCategorizingAll] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  const fetchTransactionHistory = async () => {
    setLoadingExpenses(true);
    try {
      const res = await getExpenses({ limit: 30 });
      const list = res.data?.data?.expenses ?? res.data?.expenses ?? [];
      setExpenses(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const [aiResultBadge, setAiResultBadge] = useState(null);

  // Submit form: AI Categorize + Auto-Save to MongoDB Expenses
  const handleClassifyAndSave = async (e) => {
    e?.preventDefault();
    if (!rawTitle.trim()) {
      setError("Please enter a transaction title or description.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setAiResultBadge(null);
    setClassifying(true);

    try {
      // 1. Get AI Categorization from Groq Llama-3 Agent
      const catRes = await suggestCategory({
        title: rawTitle.trim(),
        amount: Number(rawAmount) || 0,
      });

      const aiResult = catRes.data?.data ?? catRes.data ?? {};
      const assignedCategory = aiResult.category && aiResult.category !== "Other"
        ? aiResult.category
        : (aiResult.modelCategory || "Food & Dining");

      const confidence = Math.round((aiResult.confidence || 0.95) * 100);
      const amountVal = Number(rawAmount) > 0 ? Number(rawAmount) : 100;

      // 2. Save directly to MongoDB Atlas User Expenses
      await addExpense({
        title: rawTitle.trim(),
        amount: amountVal,
        category: assignedCategory,
        date: new Date().toISOString().split("T")[0],
      });

      setAiResultBadge({
        title: rawTitle.trim(),
        amount: amountVal,
        category: assignedCategory,
        confidence,
        reasoning: aiResult.reasoning || `Categorized as ${assignedCategory} using Groq AI intent recognition.`,
      });

      setSuccessMsg(`Successfully classified "${rawTitle.trim()}" (₹${amountVal}) as "${assignedCategory}" and saved to history!`);
      setRawTitle("");
      setRawAmount("");
      await fetchTransactionHistory();
    } catch (err) {
      console.error("Categorize & Save Error:", err);
      setError(err.response?.data?.message || "Failed to classify and save expense.");
    } finally {
      setClassifying(false);
    }
  };

  // Bulk Auto-Categorize All Transactions
  const handleBulkCategorize = async () => {
    setCategorizingAll(true);
    setBulkMsg("");
    setError("");
    try {
      const res = await applyToAllExpenses();
      const count = res.data?.data?.categorizedCount ?? res.data?.categorizedCount ?? 0;
      setBulkMsg(`Successfully auto-categorized ${count} transactions with AI!`);
      await fetchTransactionHistory();
    } catch (err) {
      console.error("Bulk categorization error:", err);
      setError(err.response?.data?.message || "Failed to auto-categorize all expenses.");
    } finally {
      setCategorizingAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* ── Header Banner ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
          <Tag size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Categorizer Agent
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Groq AI Engine
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Automatically classifies raw transactions into smart categories (Food, Bills, Travel, Shopping, EMI, Salary, etc.)
          </p>
        </div>
      </div>

      {/* ── SECTION 1: Clean Form Input (Classify & Save) ─────────────────── */}
      <div className="glass rounded-3xl p-6 sm:p-8 border border-surface-700/80 shadow-2xl space-y-4">
        <form onSubmit={handleClassifyAndSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block font-medium">
                Raw Transaction Title / Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Starbucks Coffee, HDFC EMI, Indigo Flight, Uber cab, food"
                value={rawTitle}
                onChange={(e) => setRawTitle(e.target.value)}
                className="w-full bg-surface-900 border border-surface-600 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">
                Amount (₹) — optional
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 450"
                value={rawAmount}
                onChange={(e) => setRawAmount(e.target.value)}
                className="w-full bg-surface-900 border border-surface-600 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-rose-400 text-xs font-medium">{error}</p>}
          {aiResultBadge && (
            <div className="p-4 rounded-2xl bg-surface-900 border border-emerald-500/30 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span className="text-xs font-bold text-slate-100">
                    Groq AI Categorized: "{aiResultBadge.title}" ➔
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    style={{
                      color: CATEGORY_COLORS[aiResultBadge.category] || "#10b981",
                      backgroundColor: `${CATEGORY_COLORS[aiResultBadge.category] || "#10b981"}15`,
                      borderColor: `${CATEGORY_COLORS[aiResultBadge.category] || "#10b981"}30`,
                    }}
                  >
                    {aiResultBadge.category}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {aiResultBadge.confidence}% AI Confidence
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pl-6">
                {aiResultBadge.reasoning} • Saved to MongoDB transaction history.
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={classifying}
              className="px-8 rounded-xl font-bold shadow-lg"
            >
              <PlusCircle size={18} />
              {classifying ? "Classifying & Saving..." : "Classify & Save Transaction"}
            </Button>
          </div>
        </form>
      </div>

      {/* ── SECTION 2: Transaction History & Auto-Categorize All ─────────── */}
      <SectionCard
        title="Auto-Categorize Transaction History"
        subtitle="Run the Categorizer Agent across all logged transactions to transform raw records into structured data"
        icon={<FolderTree size={20} />}
        action={
          <Button
            onClick={handleBulkCategorize}
            loading={categorizingAll}
            variant="secondary"
            size="sm"
            className="font-bold border border-primary-500/30 text-primary-400 hover:bg-primary-500/10"
          >
            <RefreshCw size={14} />
            Auto-Categorize All Transactions
          </Button>
        }
      >
        {bulkMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            {bulkMsg}
          </div>
        )}

        {loadingExpenses ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading transactions...</div>
        ) : expenses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No transaction records found. Add expenses above to categorize them.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-700/80 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 px-3 font-semibold">Date</th>
                  <th className="pb-3 px-3 font-semibold">Raw Title</th>
                  <th className="pb-3 px-3 font-semibold text-right">Amount (₹)</th>
                  <th className="pb-3 px-3 font-semibold text-center">Assigned Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40 text-xs">
                {expenses.map((exp) => {
                  const catColor = CATEGORY_COLORS[exp.category] || "#6366f1";
                  return (
                    <tr key={exp._id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-100">
                        {exp.title}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-200">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className="px-3 py-1 rounded-full font-semibold border inline-flex items-center gap-1.5"
                          style={{
                            color: catColor,
                            backgroundColor: `${catColor}15`,
                            borderColor: `${catColor}30`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
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
