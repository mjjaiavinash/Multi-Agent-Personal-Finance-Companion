import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Wallet, LogOut, LayoutDashboard, PlusCircle, History, FileText, TrendingUp, PiggyBank, BrainCircuit, MessageSquareText, User, Tag } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./common/NotificationBell";

const links = [
  { to: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
  { to: "/add-expense",    label: "Add Expense",    icon: PlusCircle },
  { to: "/history",        label: "History",        icon: History },
  { to: "/categorizer",    label: "Categorizer Agent", icon: Tag },
  { to: "/savings-goals",  label: "Savings Goals",  icon: PiggyBank },
  { to: "/monthly-report", label: "Monthly Report", icon: FileText },
  { to: "/ai-prediction",  label: "AI Predictions", icon: TrendingUp },
  { to: "/savings-advisor", label: "Savings Advisor Agent", icon: PiggyBank },
  { to: "/ai-chat",        label: "AI Chat",        icon: MessageSquareText },
  { to: "/profile",        label: "Profile",        icon: User },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="md:hidden bg-surface-800 border-b border-surface-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary-600 rounded-lg" aria-hidden="true">
          <Wallet size={18} className="text-white" />
        </div>
        <span className="font-bold text-slate-100">SpendSense</span>
      </div>

      {/* Hamburger toggle — aria-expanded reflects open/closed state */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          className="p-2 rounded-lg hover:bg-surface-700 text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Drawer — aria-hidden when collapsed to remove from accessibility tree */}
      <nav
        id="mobile-nav-menu"
        aria-hidden={!open}
        className={`absolute top-full left-0 right-0 bg-surface-800 border-b border-surface-700 px-4 py-3 flex flex-col gap-1 ${open ? "block" : "hidden"}`}
      >
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-slate-400 hover:text-slate-100 hover:bg-surface-700"
              }`
            }
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut size={17} aria-hidden="true" />
          Logout
        </button>
      </nav>
    </header>
  );
}
