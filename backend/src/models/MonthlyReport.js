import mongoose from "mongoose";

const monthlyReportSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    // Which month this report covers — stored as "YYYY-MM" for easy lookup
    reportMonth: {
      type:     String,
      required: true,
      match:    /^\d{4}-\d{2}$/,
    },
    status: {
      type:    String,
      enum:    ["pending", "success", "failed"],
      default: "pending",
    },
    data: {
      // ── Summary ──────────────────────────────────────────────────────────
      summary: {
        totalIncome:        { type: Number, default: 0 },
        totalExpenses:      { type: Number, default: 0 },
        netSavings:         { type: Number, default: 0 },
        savingsRate:        { type: Number, default: 0 },
        transactionCount:   { type: Number, default: 0 },
        avgDailySpend:      { type: Number, default: 0 },
        highestExpense:     { type: mongoose.Schema.Types.Mixed },
        lowestExpense:      { type: mongoose.Schema.Types.Mixed },
        mostExpensiveDay:   { type: String, default: "" },
        overview:           { type: String, default: "" },
      },

      // ── Category breakdown ────────────────────────────────────────────────
      categoryBreakdown: [
        {
          category:   { type: String },
          total:      { type: Number },
          count:      { type: Number },
          percentage: { type: Number },
          avgPerTx:   { type: Number },
          trend:      { type: String },
          vsLastMonth:{ type: Number },
        },
      ],

      // ── Budget performance ────────────────────────────────────────────────
      budgetPerformance: {
        score:          { type: Number, default: 0 },
        grade:          { type: String, default: "F" },
        totalBudget:    { type: Number, default: 0 },
        totalSpent:     { type: Number, default: 0 },
        variance:       { type: Number, default: 0 },
        summary:        { type: String, default: "" },
        categoryStatus: [
          {
            category:  { type: String },
            budget:    { type: Number },
            spent:     { type: Number },
            status:    { type: String },
            variance:  { type: Number },
          },
        ],
      },

      // ── Financial health score ────────────────────────────────────────────
      healthScore: {
        score:      { type: Number, default: 0 },
        grade:      { type: String, default: "Poor" },
        components: { type: mongoose.Schema.Types.Mixed },
        summary:    { type: String, default: "" },
      },

      // ── Weekly analysis ───────────────────────────────────────────────────
      weeklyAnalysis: [
        {
          week:        { type: String },
          weekNumber:  { type: Number },
          totalSpent:  { type: Number },
          txCount:     { type: Number },
          topCategory: { type: String },
          insight:     { type: String },
        },
      ],

      // ── Spending trends ───────────────────────────────────────────────────
      spendingTrends: {
        direction:      { type: String, default: "stable" },
        changePercent:  { type: Number, default: 0 },
        peakDay:        { type: String, default: "" },
        peakWeek:       { type: String, default: "" },
        consistencyScore: { type: Number, default: 0 },
        dailyPattern:   [{ day: String, avgSpend: Number }],
        insight:        { type: String, default: "" },
      },

      // ── AI recommendations ────────────────────────────────────────────────
      aiRecommendations: {
        executiveSummary:       { type: String, default: "" },
        immediateActions:       [{ rank: Number, action: String, impact: String, estimatedSaving: Number }],
        savingsOpportunities:   [{ title: String, description: String, estimatedSaving: Number, difficulty: String }],
        positiveHighlights:     [{ type: String }],
        riskAlerts:             [{ severity: String, title: String, description: String }],
        nextMonthGoals:         [{ type: String }],
        financialHealthSummary: { type: String, default: "" },
      },
    },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

// Fast lookup: latest report for a user+month
monthlyReportSchema.index({ user: 1, reportMonth: 1, createdAt: -1 });
monthlyReportSchema.index({ user: 1, createdAt: -1 });

const MonthlyReport = mongoose.model("MonthlyReport", monthlyReportSchema);
export default MonthlyReport;
