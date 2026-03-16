/**
 * Role-based access control types for the admin UI.
 *
 * Backend roles: owner (admin), operator, marketer (manager)
 * Frontend enum maps to these backend roles.
 */

/**
 * Frontend role enum matching backend roles:
 * - ADMIN = owner
 * - MANAGER = marketer
 * - OPERATOR = operator
 */
export enum Role {
  OPERATOR = 'operator',
  MANAGER = 'marketer',
  ADMIN = 'owner',
}

/**
 * Human-readable labels for roles (Russian)
 */
export const RoleLabel: Record<Role, string> = {
  [Role.OPERATOR]: 'Оператор',
  [Role.MANAGER]: 'Менеджер',
  [Role.ADMIN]: 'Админ',
};

// Re-export RolePermissions from api.ts for convenience
export type { RolePermissions } from '../api';

/**
 * Convert backend role string to frontend Role enum
 */
export function parseRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized === 'owner') return Role.ADMIN;
  if (normalized === 'marketer') return Role.MANAGER;
  if (normalized === 'operator') return Role.OPERATOR;
  return null;
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: string | undefined | null, targetRole: Role): boolean {
  return parseRole(role) === targetRole;
}

/**
 * Permission type - string identifier for permissions
 */
export type Permission = string;

/**
 * Permission set - collection of permissions
 */
export type PermissionSet = Set<Permission>;

/**
 * Create a permission set from an array of permissions
 */
export function createPermissionSet(permissions: Permission[]): PermissionSet {
  return new Set(permissions);
}

/**
 * Check if a permission set has a specific permission
 * Includes wildcard '*' check
 */
export function hasPermission(perms: PermissionSet, permission: Permission): boolean {
  if (perms.has('*')) return true;
  return perms.has(permission);
}

/**
 * Common permission keys used in the application
 */
export const Permissions = {
  // Dashboard
  DASHBOARD_READ: 'dashboard.read',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',

  // Customers
  CUSTOMER_LIST: 'customer.list',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_DELETE: 'customer.delete',

  // POS/Sales
  POS_SALE: 'pos.sale',
  POS_REFUND: 'pos.refund',

  // Products
  PRODUCT_READ: 'product.read',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_IMPORT: 'product.import',

  // Integrations
  INTEGRATION_READ: 'integration.read',
  INTEGRATION_CREATE: 'integration.create',
  INTEGRATION_UPDATE: 'integration.update',
  INTEGRATION_DELETE: 'integration.delete',

  // Marketing
  MARKETING_CAMPAIGN: 'marketing.campaign',
  MARKETING_SEGMENT: 'marketing.segment',
  MARKETING_TRIGGER: 'marketing.trigger',

  // Analytics
  ANALYTICS_READ: 'analytics.read',
  ANALYTICS_EXPORT: 'analytics.export',

  // Compliance
  COMPLIANCE_READ: 'compliance.read',
  COMPLIANCE_DELETE: 'compliance.delete',

  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  // Roles/Permissions (admin only)
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
} as const;

/**
 * Default permissions per role
 */
export const RoleDefaultPermissions: Record<Role, Permission[]> = {
  [Role.OPERATOR]: [
    Permissions.DASHBOARD_READ,
    Permissions.CUSTOMER_LIST,
    Permissions.CUSTOMER_READ,
    Permissions.POS_SALE,
    Permissions.PRODUCT_READ,
  ],
  [Role.MANAGER]: [
    Permissions.DASHBOARD_READ,
    Permissions.DASHBOARD_ANALYTICS,
    Permissions.CUSTOMER_LIST,
    Permissions.CUSTOMER_READ,
    Permissions.CUSTOMER_CREATE,
    Permissions.POS_SALE,
    Permissions.POS_REFUND,
    Permissions.PRODUCT_READ,
    Permissions.INTEGRATION_READ,
    Permissions.MARKETING_CAMPAIGN,
    Permissions.MARKETING_SEGMENT,
    Permissions.MARKETING_TRIGGER,
    Permissions.ANALYTICS_READ,
    Permissions.ANALYTICS_EXPORT,
  ],
  [Role.ADMIN]: [
    '*', // All permissions
  ],
};
