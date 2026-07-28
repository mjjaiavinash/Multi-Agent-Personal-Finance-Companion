import { Wallet } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="p-2.5 bg-primary-600 rounded-xl shadow-lg shadow-primary-600/30">
            <Wallet size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-100">SpendSense AI</span>
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
