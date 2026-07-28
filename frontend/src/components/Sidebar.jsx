import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, PlusCircle, History, BrainCircuit,
  MessageSquareText, User, LogOut, Wallet, Target, Activity, FileText, TrendingUp, PiggyBank, Tag,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./common/NotificationBell";

const links = [
  { to: "/dashboard",      label: "Dashboard",         icon: LayoutDashboard },
  { to: "/add-expense",    label: "Add Expense",       icon: PlusCircle },
  { to: "/history",        label: "History",           icon: History },
  { to: "/categorizer",    label: "Categorizer Agent", icon: Tag },
  { to: "/savings-goals",  label: "Savings Goals",     icon: PiggyBank },
  { to: "/monthly-report", label: "Monthly Report",  icon: FileText },
  { to: "/ai-prediction",  label: "AI Predictions",  icon: TrendingUp },
  { to: "/savings-advisor", label: "Savings Advisor Agent", icon: PiggyBank },
  { to: "/budget",         label: "Budget Planner",  icon: Target },
  { to: "/health-score",   label: "Health Score",    icon: Activity },
  { to: "/ai-chat",        label: "AI Chat",         icon: MessageSquareText },
  { to: "/profile",        label: "Profile",         icon: User },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      aria-label="Main navigation"
      className="hidden md:flex flex-col w-64 min-h-screen bg-surface-800 border-r border-surface-700 px-4 py-6"
    >
      {/* Logo + Bell */}
      <div className="flex items-center justify-between px-2 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary-600 rounded-xl" aria-hidden="true">
            <Wallet size={20} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold text-slate-100">SpendSense</span>
        </div>
        <NotificationBell />
      </div>

      {/* Nav Links */}
      <nav aria-label="App navigation" className="flex flex-col gap-1 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-surface-700"
              }`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        aria-label="Log out of SpendSense"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all mt-4"
      >
        <LogOut size={18} aria-hidden="true" />
        Logout
      </button>
    </aside>
  );
}
