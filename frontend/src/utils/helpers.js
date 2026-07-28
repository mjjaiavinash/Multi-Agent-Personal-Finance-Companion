export const formatCurrency = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const EXPENSE_CATEGORIES = [
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

export const CATEGORY_COLORS = {
  "Food & Dining":    "#8b5cf6",
  "Transportation":   "#06b6d4",
  "Shopping":         "#f59e0b",
  "Entertainment":    "#ec4899",
  "Health & Fitness": "#10b981",
  "Bills & Utilities":"#f97316",
  "Travel":           "#3b82f6",
  "Education":        "#84cc16",
  "Personal Care":    "#a855f7",
  "Other":            "#6b7280",
};
