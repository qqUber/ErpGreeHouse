import React, { ReactNode } from 'react';
import { useAuth } from '../stores/auth';
import { createPermissionSet, hasPermission, Permission } from '../types/roles';

interface PermissionGuardProps {
  /**
   * Single permission or array of permissions required
   * If array, user must have ALL permissions
   */
  permission: Permission | Permission[];
  /**
   * Children to render if user has permission
   */
  children: ReactNode;
  /**
   * Optional: Content to render if user lacks permission
   */
  fallback?: ReactNode;
  /**
   * Optional: Require all permissions (default true for array)
   * If false, user needs ANY permission from the array
   */
  requireAll?: boolean;
}

/**
 * Guard component that conditionally renders content based on user permissions.
 *
 * @example
 * // Single permission
 * <PermissionGuard permission="customer.read">
 *   <CustomerList />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard permission={['customer.read', 'customer.create']}>
 *   <CustomerManager />
 * </PermissionGuard>
 *
 * @example
 * // With fallback
 * <PermissionGuard permission="settings.update" fallback={<NoAccess />}>
 *   <SettingsForm />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = true,
}: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Create permission set from user permissions
  const userPermissions = createPermissionSet(user.permissions);

  // Check permission(s)
  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? permission.every((p) => hasPermission(userPermissions, p))
      : permission.some((p) => hasPermission(userPermissions, p))
    : hasPermission(userPermissions, permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
