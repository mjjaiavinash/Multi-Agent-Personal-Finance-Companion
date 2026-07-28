import mongoose from "mongoose";

const healthScoreSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    score: {
      type:    Number,
      required: true,
      min:     0,
      max:     100,
    },
    grade: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Poor"],
      required: true,
    },
    components: {
      savingsRate:         { type: Number, default: 0 }, // 0-100
      budgetAdherence:     { type: Number, default: 0 },
      spendingConsistency: { type: Number, default: 0 },
      expenseToIncome:     { type: Number, default: 0 },
      debtRatio:           { type: Number, default: 0 },
    },
    inputs: {
      monthlyIncome:  { type: Number, default: 0 },
      totalExpenses:  { type: Number, default: 0 },
      monthlyBudget:  { type: Number, default: 0 },
      monthsAnalyzed: { type: Number, default: 1 },
    },
    ai: {
      reason:              { type: String, default: "" },
      improvementSuggestions: [{ type: String }],
      positiveHabits:      [{ type: String }],
      riskFactors:         [{ type: String }],
    },
  },
  { timestamps: true }
);

healthScoreSchema.index({ user: 1, createdAt: -1 });

const HealthScore = mongoose.model("HealthScore", healthScoreSchema);
export default HealthScore;
