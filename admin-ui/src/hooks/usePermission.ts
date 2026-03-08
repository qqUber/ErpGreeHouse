import { useCallback, useMemo } from 'react';
import { useAuth } from '../stores/auth';
import { Permission, PermissionSet, hasPermission, createPermissionSet } from '../types/roles';

/**
 * Hook for programmatic permission checking in components.
 *
 * @example
 * const { hasPermission, hasAnyPermission, hasAllPermissions, permissions } = usePermission();
 *
 * // Check single permission
 * if (hasPermission('customer.read')) {
 *   // User can read customers
 * }
 *
 * // Check multiple permissions (any)
 * if (hasAnyPermission(['customer.read', 'customer.create'])) {
 *   // User can read OR create customers
 * }
 *
 * // Check multiple permissions (all)
 * if (hasAllPermissions(['customer.read', 'customer.create'])) {
 *   // User can read AND create customers
 * }
 */
export function usePermission() {
  const { user } = useAuth();

  // Create a memoized permission set from user permissions
  const permissions: PermissionSet = useMemo(() => {
    if (!user?.permissions) {
      return new Set<Permission>();
    }
    return createPermissionSet(user.permissions);
  }, [user?.permissions]);

  /**
   * Check if user has a specific permission.
   * Includes wildcard '*' check - if user has '*', they have all permissions.
   */
  const hasPermissionFn = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(permissions, permission);
    },
    [permissions]
  );

  /**
   * Check if user has ANY of the specified permissions.
   * Returns true if user has at least one permission from the list.
   */
  const hasAnyPermission = useCallback(
    (permissionList: Permission[]): boolean => {
      return permissionList.some((p) => hasPermission(permissions, p));
    },
    [permissions]
  );

  /**
   * Check if user has ALL of the specified permissions.
   * Returns true if user has every permission in the list.
   */
  const hasAllPermissions = useCallback(
    (permissionList: Permission[]): boolean => {
      return permissionList.every((p) => hasPermission(permissions, p));
    },
    [permissions]
  );

  /**
   * Check if user has a specific role.
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user?.role) return false;
      return user.role.toLowerCase() === role.toLowerCase();
    },
    [user?.role]
  );

  /**
   * Get all user permissions as an array.
   */
  const getPermissions = useCallback((): Permission[] => {
    return Array.from(permissions);
  }, [permissions]);

  /**
   * Check if user has wildcard permission (full access).
   */
  const hasFullAccess = useCallback((): boolean => {
    return permissions.has('*');
  }, [permissions]);

  return {
    /**
     * Check if user has a specific permission
     */
    hasPermission: hasPermissionFn,
    /**
     * Check if user has ANY permission from a list
     */
    hasAnyPermission,
    /**
     * Check if user has ALL permissions from a list
     */
    hasAllPermissions,
    /**
     * Check if user has a specific role
     */
    hasRole,
    /**
     * Get all user permissions as an array
     */
    getPermissions,
    /**
     * Check if user has full access (wildcard permission)
     */
    hasFullAccess,
    /**
     * The raw permission set
     */
    permissions,
    /**
     * User's role from the auth context
     */
    userRole: user?.role ?? null,
    /**
     * Whether user is authenticated
     */
    isAuthenticated: !!user,
  };
}
