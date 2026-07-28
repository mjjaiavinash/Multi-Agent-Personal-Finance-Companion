import mongoose from "mongoose";

const savingsGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentSavings: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      default: "General",
      enum: ["General", "Emergency Fund", "Vacation", "Gadget", "Vehicle", "Home", "Investment", "Education", "Other"],
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "paused"],
      default: "in_progress",
    },
    aiSuggestions: [
      {
        title: String,
        action: String,
        potentialSavingsPerMonth: Number,
        acceleratedCompletionDate: String,
      },
    ],
  },
  { timestamps: true }
);

// Virtual for progress percentage (0-100)
savingsGoalSchema.virtual("progressPercentage").get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(100, Math.round((this.currentSavings / this.targetAmount) * 100));
});

// Virtual for estimated completion date
savingsGoalSchema.virtual("estimatedCompletionDate").get(function () {
  if (this.currentSavings >= this.targetAmount) return "Completed";

  const remaining = this.targetAmount - this.currentSavings;
  const now = new Date();
  const created = this.createdAt || now;
  const daysElapsed = Math.round((now - created) / (1000 * 60 * 60 * 24));
  // Only calculate rate if at least 7 days have elapsed to prevent skewed day-1 rates
  if (daysElapsed < 7 || this.currentSavings <= 0) {
    return this.deadline ? this.deadline.toISOString().split("T")[0] : "Targeting Deadline";
  }
  const dailySavingsRate = this.currentSavings / daysElapsed;

  const daysNeeded = Math.ceil(remaining / dailySavingsRate);
  const estDate = new Date(now.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
  return estDate.toISOString().split("T")[0];
});

savingsGoalSchema.set("toJSON", { virtuals: true });
savingsGoalSchema.set("toObject", { virtuals: true });

const SavingsGoal = mongoose.model("SavingsGoal", savingsGoalSchema);
export default SavingsGoal;
