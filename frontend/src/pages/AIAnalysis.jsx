import React, { useEffect, useState, useRef, Component } from "react";
import { Link } from "react-router-dom";
import { BrainCircuit, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { runOrchestratorAnalysis } from "../api/orchestrator";
import useApi from "../hooks/useApi";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import ErrorBanner from "../components/common/ErrorBanner";

import ExpenseCategoriesSection from "../components/ai/ExpenseCategoriesSection";
import SpendingAnalysisSection from "../components/ai/SpendingAnalysisSection";
import SavingsSuggestionsSection from "../components/ai/SavingsSuggestionsSection";
import BudgetPlanSection from "../components/ai/BudgetPlanSection";
import AIPipelineLoader from "../components/ai/AIPipelineLoader";

class SectionErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        This section failed to render. Try refreshing.
      </div>
    );
    return this.props.children;
  }
}

export default function AIAnalysis() {
  const [months, setMonths]           = useState(6);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Optional empty array for expenses, we want the orchestrator to fetch all from backend DB
  const { data, loading, error, execute } = useApi(runOrchestratorAnalysis, null);
  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; }, [execute]);

  useEffect(() => {
    setIsInitialLoad(true);
    executeRef.current(months, false, []).finally(() => setIsInitialLoad(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const handleRefresh = () => {
    executeRef.current(months, true, []);
  };

  // Safe checks for pipeline data
  const pipeline = data?.pipeline || {};
  const summary = data?.summary || {};
  const meta = data?.meta || {};

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">AI Financial Analysis</h1>
          <p className="text-slate-400 mt-1">
            Comprehensive Groq-powered insights across your spending, savings, and budget.
            {meta.fromCache && (
              <span className="ml-2 text-xs text-primary-400/70 font-medium">(cached)</span>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/monthly-report"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-semibold transition-all"
          >
            <FileText size={15} />
            Monthly Audit Report
          </Link>

          {/* Month range selector */}
          <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1 shadow-inner">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  months === m
                    ? "bg-primary-600 text-white shadow-md shadow-primary-900/50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Show pipeline loader only on the very first load, not on refresh */}
      {(isInitialLoad && loading) && (
        <AIPipelineLoader />
      )}

      {/* Inline refresh indicator when refreshing existing data */}
      {(!isInitialLoad && loading) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-slate-400 text-sm">
          <RefreshCw size={14} className="animate-spin text-primary-400" />
          Refreshing analysis...
        </div>
      )}

      {data && !loading && (
        <>
          {/* Overview / Executive Summary */}
          {summary.executiveSummary && (
            <div className="p-5 rounded-2xl bg-primary-900/20 border border-primary-500/20 backdrop-blur-md">
              <div className="flex gap-3">
                <BrainCircuit size={24} className="text-primary-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Executive Summary</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {summary.executiveSummary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Core Sections Grid */}
          <div className="space-y-6">
            <SectionErrorBoundary><ExpenseCategoriesSection data={pipeline.budget} /></SectionErrorBoundary>
            <SectionErrorBoundary>
              <SpendingAnalysisSection data={pipeline.patterns} monthlyBreakdown={pipeline.budget?.monthlyBreakdown} />
            </SectionErrorBoundary>
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionErrorBoundary><SavingsSuggestionsSection data={pipeline.savings} /></SectionErrorBoundary>
              <SectionErrorBoundary><BudgetPlanSection data={pipeline.budget} /></SectionErrorBoundary>
            </div>
          </div>

          {/* Meta Footer */}
          {meta.generatedAt && (
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-500 mt-8 pt-6 border-t border-surface-700/50">
              <span className="flex items-center gap-1.5">
                <BrainCircuit size={14} className="text-primary-400" />
                {meta.expensesProcessed || 0} expenses analyzed
              </span>
              <span>•</span>
              <span>Generated {new Date(meta.generatedAt).toLocaleString()}</span>
              {data.pipelineStatus !== "success" && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertCircle size={14} />
                    Partial results (Status: {data.pipelineStatus})
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
