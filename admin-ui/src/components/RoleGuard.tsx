import React, { ReactNode } from 'react';
import { useAuth } from '../stores/auth';
import { hasRole, parseRole, Role } from '../types/roles';

interface RoleGuardProps {
  /**
   * Single role or array of roles allowed
   * If array, user must have ONE of the specified roles
   */
  role: Role | Role[];
  /**
   * Children to render if user has the required role
   */
  children: ReactNode;
  /**
   * Optional: Content to render if user lacks the required role
   */
  fallback?: ReactNode;
  /**
   * If true, require user to have ALL roles (only applicable for arrays)
   * Default: false - user needs ANY of the roles
   */
  requireAll?: boolean;
}

/**
 * Guard component that conditionally renders content based on user role.
 *
 * @example
 * // Single role
 * <RoleGuard role={Role.ADMIN}>
 *   <AdminPanel />
 * </RoleGuard>
 *
 * @example
 * // Multiple roles (user needs ANY of them)
 * <RoleGuard role={[Role.ADMIN, Role.MANAGER]}>
 *   <AnalyticsView />
 * </RoleGuard>
 *
 * @example
 * // With fallback
 * <RoleGuard role={Role.ADMIN} fallback={<AccessDenied />}>
 *   <Settings />
 * </RoleGuard>
 */
export function RoleGuard({ role, children, fallback = null, requireAll = false }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  const userRole = parseRole(user.role);

  if (!userRole) {
    return <>{fallback}</>;
  }

  // Check role(s)
  const hasAccess = Array.isArray(role)
    ? requireAll
      ? role.every((r) => userRole === r)
      : role.some((r) => userRole === r)
    : userRole === role;

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
