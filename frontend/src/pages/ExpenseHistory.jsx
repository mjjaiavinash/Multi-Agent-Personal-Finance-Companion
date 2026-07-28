import { useEffect, useState, useCallback } from "react";
import { Search, Filter } from "lucide-react";
import ExpenseCard from "../components/common/ExpenseCard";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import { getExpenses, deleteExpense, updateExpense } from "../api/expenses";
import { EXPENSE_CATEGORIES, formatCurrency } from "../utils/helpers";

const categoryOptions = [
  { value: "", label: "All Categories" },
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function ExpenseHistory() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      const { data } = await getExpenses(params);
      setExpenses(data.data.expenses || []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e._id !== id));
  };

  const handleEditOpen = (expense) => {
    setEditTarget(expense);
    setEditForm({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date?.split("T")[0],
      notes: expense.notes || "",
    });
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    try {
      const { data } = await updateExpense(editTarget._id, { ...editForm, amount: Number(editForm.amount) });
      setExpenses((prev) => prev.map((e) => (e._id === editTarget._id ? data.data.expense : e)));
      setEditTarget(null);
    } finally {
      setEditLoading(false);
    }
  };

  const filtered = expenses.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Expense History</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {filtered.length} records · Total: {formatCurrency(total)}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface-700 border border-surface-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
        <div className="w-48">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categoryOptions}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <Loader />
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((exp) => (
            <ExpenseCard
              key={exp._id}
              expense={exp}
              onEdit={handleEditOpen}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl py-16 text-center text-slate-500 text-sm">
          No expenses found.
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Expense">
        {editTarget && (
          <div className="flex flex-col gap-4">
            <Input
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount"
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
              />
              <Input
                label="Date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <Select
              label="Category"
              value={editForm.category}
              onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button className="flex-1" loading={editLoading} onClick={handleEditSave}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
