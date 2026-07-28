import { useNavigate } from "react-router-dom";
import { PlusCircle, BrainCircuit, MessageSquareText, FileText, TrendingUp, PiggyBank } from "lucide-react";

const actions = [
  {
    label:    "Add Expense",
    sublabel: "Record a transaction",
    icon:     PlusCircle,
    to:       "/add-expense",
    style:    "from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-primary-600/25",
  },
  {
    label:    "Savings Goals",
    sublabel: "Track financial targets",
    icon:     PiggyBank,
    to:       "/savings-goals",
    style:    "from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-600/25",
  },
  {
    label:    "AI Predictions",
    sublabel: "Forecast future spend",
    icon:     TrendingUp,
    to:       "/ai-prediction",
    style:    "from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 shadow-indigo-600/25",
  },
  {
    label:    "Monthly Report",
    sublabel: "AI financial audit",
    icon:     FileText,
    to:       "/monthly-report",
    style:    "from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600 shadow-blue-600/25",
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map(({ label, sublabel, icon: Icon, to, style }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className={`bg-gradient-to-br ${style} rounded-2xl p-5 flex items-center gap-4 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl text-left group`}
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-white/60 mt-0.5">{sublabel}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
