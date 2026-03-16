import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from '../../api';
import type {
  CustomerData,
  MarketingData,
  OperationalData,
  ProductData,
} from '../../hooks/useDashboard';
import { useAuth } from '../../stores/auth';
import { hasPermission, Permission, PermissionSet, Role } from '../../types/roles';
import { AdminDashboard } from './AdminDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { OperatorDashboard } from './OperatorDashboard';

interface DashboardWrapperProps {
  data?: {
    operational?: OperationalData | null;
    customers?: CustomerData | null;
    products?: ProductData | null;
    marketing?: MarketingData | null;
    integrations?: any;
  } | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

/**
 * DashboardWrapper - Role-specific dashboard renderer
 *
 * This component determines which dashboard to render based on the user's role.
 * It serves as the entry point for all dashboard rendering in the application.
 *
 * Role hierarchy:
 * - owner (ADMIN) - Full system access with all widgets
 * - marketer (MANAGER) - Business analytics and marketing features
 * - operator (OPERATOR) - Basic POS and customer lookup
 */
export function DashboardWrapper({ data, onNavigate }: DashboardWrapperProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  // Render the appropriate dashboard based on role
  const role = user.role?.toLowerCase();

  switch (role) {
    case 'operator':
      return <OperatorDashboard data={data} onNavigate={onNavigate} />;

    case 'marketer':
      return <ManagerDashboard data={data} onNavigate={onNavigate} />;

    case 'owner':
    case 'admin':
      return <AdminDashboard data={data} onNavigate={onNavigate} />;

    default:
      // Fallback for unknown roles - render operator dashboard by default
      return <OperatorDashboard data={data} onNavigate={onNavigate} />;
  }
}

/**
 * Get the user's role from auth context
 */
export function getUserRole(user: { role?: string | null } | null): Role | null {
  if (!user?.role) return null;

  const role = user.role.toLowerCase();

  if (role === 'owner' || role === 'admin') return Role.ADMIN;
  if (role === 'marketer' || role === 'manager') return Role.MANAGER;
  if (role === 'operator') return Role.OPERATOR;

  return null;
}

/**
 * Check if user has access to a specific widget based on their permissions
 */
export function canAccessWidget(
  permissions: PermissionSet | null | undefined,
  requiredPermission: Permission
): boolean {
  if (!permissions) return false;
  return hasPermission(permissions, requiredPermission);
}

export default DashboardWrapper;
