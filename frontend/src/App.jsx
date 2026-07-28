import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Landing        from "./pages/Landing";
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import Dashboard      from "./pages/Dashboard";
import AddExpense     from "./pages/AddExpense";
import ExpenseHistory from "./pages/ExpenseHistory";
import AIAnalysis     from "./pages/AIAnalysis";
import AIFinanceChat  from "./pages/AIFinanceChat";
import BudgetPlanner  from "./pages/BudgetPlanner";
import Profile        from "./pages/Profile";
import HealthScore    from "./pages/HealthScore";
import MonthlyReport  from "./pages/MonthlyReport";
import AIPrediction   from "./pages/AIPrediction";
import SavingsGoals   from "./pages/SavingsGoals";
import CategorizerPage from "./pages/CategorizerPage";
import SavingsAdvisorPage from "./pages/SavingsAdvisorPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/add-expense"    element={<AddExpense />} />
            <Route path="/history"        element={<ExpenseHistory />} />
            <Route path="/categorizer"    element={<CategorizerPage />} />
            <Route path="/savings-goals"  element={<SavingsGoals />} />
            <Route path="/savings-advisor" element={<SavingsAdvisorPage />} />
            <Route path="/monthly-report" element={<MonthlyReport />} />
            <Route path="/ai-prediction"  element={<AIPrediction />} />
            <Route path="/ai-analysis"    element={<SavingsAdvisorPage />} />
            <Route path="/ai-chat"        element={<AIFinanceChat />} />
            <Route path="/budget"         element={<BudgetPlanner />} />
            <Route path="/health-score"   element={<HealthScore />} />
            <Route path="/profile"        element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
