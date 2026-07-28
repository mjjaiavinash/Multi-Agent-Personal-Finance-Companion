import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import * as budgetPlannerService from "../services/budgetPlannerService.js";
import { generateBudgetPlanPDF } from "../services/pdfService.js";

// GET /api/v1/budget?months=3&refresh=false&monthlyIncome=30000
const getBudgetPlan = asyncHandler(async (req, res) => {
  const months        = Math.min(Math.max(parseInt(req.query.months, 10) || 3, 1), 6);
  const forceRefresh  = req.query.refresh === "true";
  const monthlyIncome = Number(req.query.monthlyIncome) || 0;

  const result = await budgetPlannerService.getBudgetPlan(
    req.user._id,
    months,
    forceRefresh,
    monthlyIncome
  );

  const message = result.fromCache
    ? "Budget plan retrieved from cache."
    : "Budget plan generated successfully.";

  ApiResponse.ok(res, result, message);
});

// DELETE /api/v1/budget/cache
const invalidateCache = asyncHandler(async (req, res) => {
  budgetPlannerService.invalidateBudgetCache(req.user._id);
  ApiResponse.ok(res, null, "Budget cache cleared. Next request will regenerate a fresh plan.");
});

// GET /api/v1/budget/pdf?income=50000
const downloadBudgetPlanPDF = asyncHandler(async (req, res) => {
  const income = Number(req.query.income) || req.user?.monthlyIncome || 50000;

  const BUDGET_ALLOCATION_RULES = [
    { key: "housing",       label: "House Rent / Housing",                         pct: 25, desc: "Rent, home EMI, maintenance & housing expenses" },
    { key: "food",          label: "Food & Groceries",                              pct: 15, desc: "Groceries, daily dining, food delivery & household supplies" },
    { key: "savings",       label: "Savings & Investments",                         pct: 15, desc: "Long-term wealth, mutual funds, SIPs & equity investments" },
    { key: "transport",     label: "Transport",                                     pct: 10, desc: "Fuel, commuting, public transit & vehicle maintenance" },
    { key: "utilities",     label: "Utilities (Electricity, Water, Internet, Mobile)", pct: 8, desc: "Power, water bill, broadband & mobile recharges" },
    { key: "shopping",      label: "Shopping",                                      pct: 7,  desc: "Apparel, personal care & lifestyle purchases" },
    { key: "healthcare",    label: "Healthcare / Medical",                          pct: 5,  desc: "Medicines, health insurance & wellness reserves" },
    { key: "education",     label: "Education / Learning",                          pct: 5,  desc: "Courses, books, tuition & professional skill upgrades" },
    { key: "entertainment", label: "Entertainment",                                 pct: 5,  desc: "Movies, streaming services & leisure activities" },
    { key: "travel",        label: "Travel / Vacation Fund",                        pct: 5,  desc: "Weekend getaways, short trips & annual vacation fund" },
    { key: "emergency",     label: "Emergency Fund",                                pct: 5,  desc: "Liquid safety net for unforeseen emergencies" },
  ];

  const categoryAllocations = BUDGET_ALLOCATION_RULES.map((rule) => ({
    ...rule,
    amount: Math.round((income * rule.pct) / 100),
  }));

  const planData = {
    income,
    categoryAllocations,
  };

  const doc = generateBudgetPlanPDF(planData, req.user);

  const filename = `SpendSense_Budget_Plan_${income}_${Date.now()}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);
  doc.end();
});

export { getBudgetPlan, invalidateCache, downloadBudgetPlanPDF };
