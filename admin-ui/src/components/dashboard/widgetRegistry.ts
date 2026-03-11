import { Role } from '../../types/roles';
import { Widget } from '../../types/widgets';
import { AnalyticsWidget } from './AnalyticsWidget';
import { CustomersWidget } from './CustomersWidget';
import { IntegrationsWidget } from './IntegrationsWidget';
import { MarketingWidget } from './MarketingWidget';
import { ProductsWidget } from './ProductsWidget';
import { SalesWidget } from './SalesWidget';

// Define all available widgets
export const widgets: Widget[] = [
  {
    id: 'customers',
    name: 'Customers',
    component: CustomersWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER],
  },
  {
    id: 'products',
    name: 'Products',
    component: ProductsWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER],
  },
  {
    id: 'sales',
    name: 'Sales',
    component: SalesWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR],
  },
  {
    id: 'integrations',
    name: 'Integrations',
    component: IntegrationsWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    component: MarketingWidget,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    component: AnalyticsWidget,
    defaultSize: { w: 8, h: 8 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 12 },
    compactable: false,
    roles: [Role.ADMIN, Role.MANAGER],
  },
];

// Get available widgets for a specific role
export function getAvailableWidgets(role: Role) {
  return widgets.filter((widget) => widget.roles.includes(role));
}
