import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "./Loader";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <Loader fullScreen />;
  return token ? children : <Navigate to="/login" replace />;
}
