import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import { addExpense } from "../api/expenses";
import { EXPENSE_CATEGORIES } from "../utils/helpers";

const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }));

export default function AddExpense() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0],
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      errs.amount = "Enter a valid amount.";
    if (!form.date) errs.date = "Date is required.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await addExpense({ ...form, amount: Number(form.amount) });
      setSuccess(true);
      setTimeout(() => navigate("/dashboard", { state: { refetch: true } }), 1200);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || "Failed to add expense." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Add Expense</h1>
        <p className="text-slate-400 text-sm mt-0.5">Record a new transaction</p>
      </div>

      <div className="glass rounded-2xl p-6">
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            Expense added! Redirecting...
          </div>
        )}
        {errors.submit && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Title"
            name="title"
            placeholder="e.g. Grocery run"
            value={form.title}
            onChange={handleChange}
            error={errors.title}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹)"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              error={errors.amount}
            />
            <Input
              label="Date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              error={errors.date}
            />
          </div>
          <Select
            label="Category"
            name="category"
            value={form.category}
            onChange={handleChange}
            options={categoryOptions}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Notes (optional)</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Any additional details..."
              value={form.notes}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-700 border border-surface-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
            />
          </div>
          <Button type="submit" loading={loading} className="mt-2 w-full">
            <PlusCircle size={17} /> Add Expense
          </Button>
        </form>
      </div>
    </div>
  );
}
