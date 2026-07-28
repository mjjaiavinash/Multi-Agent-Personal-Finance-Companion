import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../api/auth";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    monthlyIncome: "",
    monthlyBudget: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : 0,
        monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : 0,
      });
      login(data.data.user, data.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.errors?.[0] || err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-slate-100 mb-1">Create account</h2>
      <p className="text-slate-400 text-sm mb-6">Start your financial journey</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full Name"
          type="text"
          name="name"
          placeholder="Enter your name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-800/50 border border-surface-700/60">
          <Input
            label="Monthly Income (₹) (Optional)"
            type="number"
            name="monthlyIncome"
            placeholder="e.g. 50000"
            value={form.monthlyIncome}
            onChange={handleChange}
            min="0"
          />
          <Input
            label="Monthly Budget (₹) (Optional)"
            type="number"
            name="monthlyBudget"
            placeholder="e.g. 30000"
            value={form.monthlyBudget}
            onChange={handleChange}
            min="0"
          />
        </div>

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          required
          rightIcon={
            <button type="button" onClick={() => setShowPassword((p) => !p)} className="text-slate-400 hover:text-slate-200 transition-colors">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />
        <Input
          label="Confirm Password"
          type={showConfirm ? "text" : "password"}
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
          rightIcon={
            <button type="button" onClick={() => setShowConfirm((p) => !p)} className="text-slate-400 hover:text-slate-200 transition-colors">
              {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />
        <Button type="submit" loading={loading} className="mt-2 w-full">
          <UserPlus size={17} /> Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
