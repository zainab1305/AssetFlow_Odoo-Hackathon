import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading AssetFlow...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};