import { Link } from "react-router-dom";
import { Wallet, BrainCircuit, BarChart3, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import Button from "../components/common/Button";

const features = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Insights",
    desc: "AI analyzes your spending patterns and delivers personalized financial advice.",
    color: "text-primary-400 bg-primary-500/10",
  },
  {
    icon: BarChart3,
    title: "Visual Analytics",
    desc: "Interactive charts and dashboards give you a clear picture of where your money goes.",
    color: "text-emerald-400 bg-emerald-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    desc: "JWT authentication and encrypted storage keep your financial data safe.",
    color: "text-amber-400 bg-amber-500/10",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] bg-primary-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] bg-primary-700/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-surface-700/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-600 rounded-xl">
              <Wallet size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold">SpendSense AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-100 leading-tight mb-6">
          Your Personal{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
            Finance AI
          </span>{" "}
          Companion
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Track expenses, uncover spending patterns, and get AI-driven advice — all in one intelligent dashboard.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register">
            <Button size="lg" className="shadow-lg shadow-primary-600/30">
              Start for Free <ArrowRight size={18} />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">Sign In</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:border-surface-600 transition-all">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-surface-700/50 py-6 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} SpendSense AI. Built for the hackathon.
      </footer>
    </div>
  );
}
