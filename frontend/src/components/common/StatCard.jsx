const colorMap = {
  primary: {
    icon:   "text-primary-400 bg-primary-500/10 border border-primary-500/20",
    glow:   "hover:shadow-primary-500/10",
    accent: "bg-primary-500",
  },
  emerald: {
    icon:   "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    glow:   "hover:shadow-emerald-500/10",
    accent: "bg-emerald-500",
  },
  rose: {
    icon:   "text-rose-400 bg-rose-500/10 border border-rose-500/20",
    glow:   "hover:shadow-rose-500/10",
    accent: "bg-rose-500",
  },
  amber: {
    icon:   "text-amber-400 bg-amber-500/10 border border-amber-500/20",
    glow:   "hover:shadow-amber-500/10",
    accent: "bg-amber-500",
  },
  cyan: {
    icon:   "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20",
    glow:   "hover:shadow-cyan-500/10",
    accent: "bg-cyan-500",
  },
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = "primary" }) {
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`glass rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg ${c.glow} transition-all duration-300 group`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div className={`p-2.5 rounded-xl ${c.icon} transition-transform duration-200 group-hover:scale-110`}>
          <Icon size={18} />
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-slate-100 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.positive
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-rose-400 bg-rose-500/10"
          }`}>
            {trend.positive ? "▲" : "▼"} {trend.label}
          </span>
          {trend.sublabel && (
            <span className="text-xs text-slate-500">{trend.sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
