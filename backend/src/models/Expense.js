import mongoose from "mongoose";

const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Health & Fitness",
  "Bills & Utilities",
  "Housing & EMI",
  "Travel",
  "Education",
  "Personal Care",
  "Other",
];

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    title: {
      type:      String,
      required:  [true, "Title is required."],
      trim:      true,
      minlength: [2,   "Title must be at least 2 characters."],
      maxlength: [100, "Title cannot exceed 100 characters."],
    },
    amount: {
      type:    Number,
      required:[true, "Amount is required."],
      min:     [0.01, "Amount must be greater than 0."],
      set:     (v) => Math.round(v * 100) / 100, // store max 2 decimal places
    },
    category: {
      type:     String,
      required: [true, "Category is required."],
      enum:     { values: CATEGORIES, message: "Invalid category." },
    },
    date: {
      type:     Date,
      required: [true, "Date is required."],
      default:  Date.now,
    },
    notes: {
      type:      String,
      trim:      true,
      maxlength: [500, "Notes cannot exceed 500 characters."],
      default:   "",
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound indexes for common query patterns ───────────────────────────────
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });
expenseSchema.index({ user: 1, date: -1, category: 1 });

// ─── Static: per-user summary aggregation ────────────────────────────────────
expenseSchema.statics.getSummary = async function (userId) {
  const rawId = userId?._id || userId?.id || userId;
  const userObjId = mongoose.Types.ObjectId.isValid(rawId)
    ? new mongoose.Types.ObjectId(String(rawId))
    : rawId;

  const now            = new Date();
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Direct find query to guarantee 100% accurate fallback matching across ObjectId & String types
  const allExpenses = await this.find({
    user: { $in: [userObjId, String(rawId), String(userObjId)] },
  }).lean();

  let totalSpent     = 0;
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  const byCategory   = {};
  const monthlyMap   = {};

  allExpenses.forEach((exp) => {
    const amt     = Number(exp.amount || 0);
    const expDate = new Date(exp.date);
    totalSpent   += amt;

    if (exp.category) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + amt;
    }

    if (expDate >= monthStart) {
      thisMonthTotal += amt;
    } else if (expDate >= lastMonthStart && expDate <= lastMonthEnd) {
      lastMonthTotal += amt;
    }

    const monthKey = expDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;
  });

  const monthly = Object.entries(monthlyMap).map(([m, total]) => ({
    month: m,
    total: Math.round(total * 100) / 100,
  }));

  return {
    totalSpent:  Math.round(totalSpent * 100) / 100,
    count:       allExpenses.length,
    avgPerDay:   allExpenses.length > 0 ? Math.round((totalSpent / allExpenses.length) * 100) / 100 : 0,
    thisMonth:   Math.round(thisMonthTotal * 100) / 100,
    lastMonth:   Math.round(lastMonthTotal * 100) / 100,
    byCategory,
    monthly,
  };
};

const Expense = mongoose.model("Expense", expenseSchema);
export { CATEGORIES };
export default Expense;
