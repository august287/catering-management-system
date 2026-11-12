import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, isAdminRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** A single role or a list of roles allowed to view this route. */
  allowedRole?: UserRole | UserRole[];
}

/** Home page for each role. */
export function homeForRole(role: UserRole | null | undefined): string {
  return isAdminRole(role) ? '/admin/dashboard' : '/customer/menu';
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
          <p className="font-serif text-sm text-text-muted">Loading Natalie's Catering...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowed = allowedRole === undefined ? null : Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (allowed && role && !allowed.includes(role)) {
    // Redirect to proper role portal
    const destination = homeForRole(role);
    if (location.pathname !== destination) {
      return <Navigate to={destination} replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
