import { Role, Permission, Permissions } from '../../types/roles';

/**
 * Widget identifier type - unique key for each dashboard widget
 */
export type WidgetId =
  // Operator widgets
  | 'operator.quick_actions'
  | 'operator.shift_stats'
  | 'operator.recent_transactions'
  | 'operator.empty_state'

  // Manager widgets
  | 'manager.kpi_cards'
  | 'manager.active_campaigns'
  | 'manager.recent_events'
  | 'manager.sales_trend'
  | 'manager.top_products'
  | 'manager.integrations_status'

  // Admin widgets
  | 'admin.system_overview'
  | 'admin.system_health'
  | 'admin.security_access'
  | 'admin.performance_metrics'
  | 'admin.recent_activity'
  | 'admin.quick_actions'

  // Shared widgets (available to all roles)
  | 'shared.customers'
  | 'shared.products'
  | 'shared.pos';

/**
 * Widget metadata
 */
export interface WidgetMetadata {
  id: WidgetId;
  name: string;
  description: string;
  requiredPermissions: Permission[];
  requiredRoles: Role[];
  category: 'kpi' | 'analytics' | 'operations' | 'marketing' | 'security' | 'system';
}

/**
 * Widget registry - maps widgets to their required roles and permissions
 */
export const WIDGET_REGISTRY: Record<WidgetId, WidgetMetadata> = {
  // ==================== OPERATOR WIDGETS ====================
  'operator.quick_actions': {
    id: 'operator.quick_actions',
    name: 'Быстрые действия',
    description:
      'Quick access buttons for common operator tasks (new sale, find customer, catalog)',
    requiredPermissions: [
      Permissions.POS_SALE,
      Permissions.CUSTOMER_LIST,
      Permissions.PRODUCT_READ,
    ],
    requiredRoles: [Role.OPERATOR],
    category: 'operations',
  },
  'operator.shift_stats': {
    id: 'operator.shift_stats',
    name: 'Статистика смены',
    description: "Today's sales count, revenue, and bonus stats",
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.OPERATOR],
    category: 'kpi',
  },
  'operator.recent_transactions': {
    id: 'operator.recent_transactions',
    name: 'Последние операции',
    description: 'List of recent transactions for quick reference',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.OPERATOR],
    category: 'operations',
  },
  'operator.empty_state': {
    id: 'operator.empty_state',
    name: 'Пустое состояние',
    description: 'Empty state shown when no transactions exist',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.OPERATOR],
    category: 'operations',
  },

  // ==================== MANAGER WIDGETS ====================
  'manager.kpi_cards': {
    id: 'manager.kpi_cards',
    name: 'KPI показатели',
    description: 'Business KPIs: total customers, average check, net balance, loyalty %',
    requiredPermissions: [Permissions.DASHBOARD_READ, Permissions.DASHBOARD_ANALYTICS],
    requiredRoles: [Role.MANAGER],
    category: 'kpi',
  },
  'manager.active_campaigns': {
    id: 'manager.active_campaigns',
    name: 'Активные кампании',
    description: 'List of active marketing campaigns with performance metrics',
    requiredPermissions: [Permissions.MARKETING_CAMPAIGN],
    requiredRoles: [Role.MANAGER],
    category: 'marketing',
  },
  'manager.recent_events': {
    id: 'manager.recent_events',
    name: 'Последние события',
    description: 'Recent marketing events and message deliveries',
    requiredPermissions: [Permissions.MARKETING_CAMPAIGN],
    requiredRoles: [Role.MANAGER],
    category: 'marketing',
  },
  'manager.sales_trend': {
    id: 'manager.sales_trend',
    name: 'Тренд продаж',
    description: 'Sales trend chart for business analysis',
    requiredPermissions: [Permissions.ANALYTICS_READ],
    requiredRoles: [Role.MANAGER],
    category: 'analytics',
  },
  'manager.top_products': {
    id: 'manager.top_products',
    name: 'Популярные товары',
    description: 'Top selling products list',
    requiredPermissions: [Permissions.PRODUCT_READ],
    requiredRoles: [Role.MANAGER],
    category: 'analytics',
  },
  'manager.integrations_status': {
    id: 'manager.integrations_status',
    name: 'Статус интеграций',
    description: 'Current status of connected integrations (Telegram, VK)',
    requiredPermissions: [Permissions.INTEGRATION_READ],
    requiredRoles: [Role.MANAGER],
    category: 'operations',
  },

  // ==================== ADMIN WIDGETS ====================
  'admin.system_overview': {
    id: 'admin.system_overview',
    name: 'Обзор системы',
    description: 'System-wide KPIs: total customers, sales, revenue, net balance',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.ADMIN],
    category: 'kpi',
  },
  'admin.system_health': {
    id: 'admin.system_health',
    name: 'Состояние системы',
    description: 'Database, Redis, and Workers status',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.ADMIN],
    category: 'system',
  },
  'admin.security_access': {
    id: 'admin.security_access',
    name: 'Безопасность и доступ',
    description: 'Active sessions and security controls',
    requiredPermissions: [Permissions.DASHBOARD_READ, Permissions.ROLES_READ],
    requiredRoles: [Role.ADMIN],
    category: 'security',
  },
  'admin.performance_metrics': {
    id: 'admin.performance_metrics',
    name: 'Метрики производительности',
    description: 'Response time, success rate, active connections',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.ADMIN],
    category: 'system',
  },
  'admin.recent_activity': {
    id: 'admin.recent_activity',
    name: 'Недавняя активность',
    description: 'Recent transactions and system events',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.ADMIN],
    category: 'analytics',
  },
  'admin.quick_actions': {
    id: 'admin.quick_actions',
    name: 'Быстрые действия',
    description: 'Quick action buttons for admin tasks',
    requiredPermissions: [Permissions.DASHBOARD_READ],
    requiredRoles: [Role.ADMIN],
    category: 'operations',
  },

  // ==================== SHARED WIDGETS ====================
  'shared.customers': {
    id: 'shared.customers',
    name: 'Клиенты',
    description: 'Customer information and management (used across roles)',
    requiredPermissions: [Permissions.CUSTOMER_LIST, Permissions.CUSTOMER_READ],
    requiredRoles: [Role.OPERATOR, Role.MANAGER, Role.ADMIN],
    category: 'operations',
  },
  'shared.products': {
    id: 'shared.products',
    name: 'Products',
    description: 'Product catalog access (used across roles)',
    requiredPermissions: [Permissions.PRODUCT_READ],
    requiredRoles: [Role.OPERATOR, Role.MANAGER, Role.ADMIN],
    category: 'operations',
  },
  'shared.pos': {
    id: 'shared.pos',
    name: 'Точка продаж',
    description: 'POS interface for making sales',
    requiredPermissions: [Permissions.POS_SALE],
    requiredRoles: [Role.OPERATOR, Role.MANAGER, Role.ADMIN],
    category: 'operations',
  },
};

/**
 * Get all widgets available for a specific role
 */
export function getWidgetsForRole(role: Role): WidgetId[] {
  const widgets: WidgetId[] = [];

  for (const [widgetId, metadata] of Object.entries(WIDGET_REGISTRY)) {
    if (metadata.requiredRoles.includes(role)) {
      widgets.push(widgetId as WidgetId);
    }
  }

  return widgets;
}

/**
 * Get all widgets available for a specific permission set
 */
export function getWidgetsForPermissions(permissions: Set<Permission>): WidgetId[] {
  const widgets: WidgetId[] = [];

  for (const [widgetId, metadata] of Object.entries(WIDGET_REGISTRY)) {
    // Check if user has all required permissions
    const hasAllPermissions = metadata.requiredPermissions.every(
      (perm) => permissions.has(perm) || permissions.has('*')
    );

    if (hasAllPermissions) {
      widgets.push(widgetId as WidgetId);
    }
  }

  return widgets;
}

/**
 * Check if a widget is accessible for given role and permissions
 */
export function isWidgetAccessible(
  widgetId: WidgetId,
  role: Role | null,
  permissions: Set<Permission> | null
): boolean {
  const widget = WIDGET_REGISTRY[widgetId];
  if (!widget) return false;

  // Check role access first
  if (role && widget.requiredRoles.includes(role)) {
    return true;
  }

  // Check permission access
  if (permissions) {
    const hasAllPermissions = widget.requiredPermissions.every(
      (perm) => permissions.has(perm) || permissions.has('*')
    );
    if (hasAllPermissions) {
      return true;
    }
  }

  return false;
}

/**
 * Get widgets grouped by category for a specific role
 */
export function getWidgetsByCategory(role: Role): Record<string, WidgetId[]> {
  const widgets = getWidgetsForRole(role);
  const grouped: Record<string, WidgetId[]> = {};

  for (const widgetId of widgets) {
    const widget = WIDGET_REGISTRY[widgetId];
    const category = widget.category;

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(widgetId);
  }

  return grouped;
}

/**
 * Default dashboard configurations per role
 */
export const ROLE_DASHBOARD_CONFIG: Record<Role, WidgetId[]> = {
  [Role.OPERATOR]: [
    'operator.quick_actions',
    'operator.shift_stats',
    'operator.recent_transactions',
    'operator.empty_state',
  ],
  [Role.MANAGER]: [
    'manager.kpi_cards',
    'manager.active_campaigns',
    'manager.recent_events',
    'manager.sales_trend',
    'manager.top_products',
    'manager.integrations_status',
  ],
  [Role.ADMIN]: [
    'admin.system_overview',
    'admin.system_health',
    'admin.security_access',
    'admin.performance_metrics',
    'admin.recent_activity',
    'admin.quick_actions',
  ],
};

export default WIDGET_REGISTRY;
