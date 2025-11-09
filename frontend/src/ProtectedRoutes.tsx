import type { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[]; // roles allowed to access this route
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Checking credentials...
      </div>
    );
  }

  // Not logged in -> redirect to login and keep intended path
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If allowedRoles provided, ensure user's role is included
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role ?? '')) {
    return <Navigate to="/" state={{ from: location, unauthorized: true }} replace />;
  }

  return <>{children}</>;
}
