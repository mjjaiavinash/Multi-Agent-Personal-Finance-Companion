import { useState } from "react";
import { User, Mail, Lock, Save } from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../api/auth";

export default function Profile() {
  const { user, login, token } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    monthlyIncome: user?.monthlyIncome ?? 0,
    monthlyBudget: user?.monthlyBudget ?? 0,
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        monthlyIncome: Number(form.monthlyIncome),
        monthlyBudget: Number(form.monthlyBudget),
      };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      const { data } = await updateProfile(payload);
      login(data.data?.user ?? data.user, token);
      setSuccess("Profile updated successfully.");
      setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your account settings</p>
      </div>

      {/* Avatar Card */}
      <div className="glass rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-400">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-100">{user?.name}</p>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-slate-100 mb-5">Edit Information</h2>

        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <div className="border-t border-surface-700 pt-4 mt-1">
            <p className="text-sm font-medium text-slate-300 mb-3">Financial Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monthly Income ($)"
                name="monthlyIncome"
                type="number"
                min="0"
                value={form.monthlyIncome}
                onChange={handleChange}
              />
              <Input
                label="Monthly Budget ($)"
                name="monthlyBudget"
                type="number"
                min="0"
                value={form.monthlyBudget}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="border-t border-surface-700 pt-4 mt-1">
            <p className="text-sm font-medium text-slate-400 mb-3">Change Password (optional)</p>
            <div className="flex flex-col gap-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                value={form.currentPassword}
                onChange={handleChange}
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="Min. 8 characters"
                value={form.newPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="mt-2 w-full">
            <Save size={16} /> Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
