import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ErrorState, LoadingState } from "./StoreState";

export function ProtectedAdmin() {
  const { loading, session, isAdmin, verificationError } = useAuth();
  if (loading) return <div className="admin-loading"><LoadingState label="Verificando acesso..." /></div>;
  if (verificationError) return <div className="admin-loading"><ErrorState message={verificationError} onRetry={() => window.location.reload()} /></div>;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/admin/login?erro=sem-acesso" replace />;
  return <Outlet />;
}
