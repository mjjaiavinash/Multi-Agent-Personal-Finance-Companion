import mongoose from "mongoose";

const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Health & Fitness",
  "Bills & Utilities",
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
  const userObjId = new mongoose.Types.ObjectId(userId);

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [overall, monthly] = await Promise.all([
    // ── Overall totals + by-category breakdown ──────────────────────────────
    this.aggregate([
      { $match: { user: userObjId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id:        null,
                totalSpent: { $sum: "$amount" },
                count:      { $sum: 1 },
                avgPerDay:  { $avg: "$amount" },
              },
            },
          ],
          byCategory: [
            { $group: { _id: "$category", total: { $sum: "$amount" } } },
          ],
          thisMonth: [
            { $match: { date: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          lastMonth: [
            { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
        },
      },
    ]),

    // ── Last 6 months bar chart data ────────────────────────────────────────
    this.aggregate([
      {
        $match: {
          user: userObjId,
          date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id:   0,
          month: {
            $dateToString: {
              format: "%b %Y",
              date: {
                $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 },
              },
            },
          },
          total: 1,
        },
      },
    ]),
  ]);

  const totals     = overall[0]?.totals[0]     || {};
  const thisMonthTotal = overall[0]?.thisMonth[0]?.total || 0;
  const lastMonthTotal = overall[0]?.lastMonth[0]?.total || 0;

  const byCategory = (overall[0]?.byCategory || []).reduce((acc, item) => {
    acc[item._id] = item.total;
    return acc;
  }, {});

  return {
    totalSpent:  totals.totalSpent || 0,
    count:       totals.count      || 0,
    avgPerDay:   Math.round((totals.avgPerDay || 0) * 100) / 100,
    thisMonth:   thisMonthTotal,
    lastMonth:   lastMonthTotal,
    byCategory,
    monthly,
  };
};

const Expense = mongoose.model("Expense", expenseSchema);
export { CATEGORIES };
export default Expense;
