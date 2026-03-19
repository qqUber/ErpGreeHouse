import { Role } from '../../types/roles';
import { Widget } from '../../types/widgets';
import { AttentionRequiredWidget } from './AttentionRequiredWidget';
import { CustomersWidget } from './CustomersWidget';
import { IntegrationsWidget } from './IntegrationsWidget';
import { LoyaltyHealthWidget } from './LoyaltyHealthWidget';
import { MarketingWidget } from './MarketingWidget';
import { ProductsWidget } from './ProductsWidget';
import { SalesWidget } from './SalesWidget';

// Define all available widgets
export const widgets: Widget[] = [
  {
    id: 'customers',
    name: 'Customers',
    component: CustomersWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR],
  },
  {
    id: 'products',
    name: 'Products',
    component: ProductsWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR],
  },
  {
    id: 'sales',
    name: 'Sales',
    component: SalesWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR],
  },
  {
    id: 'integrations',
    name: 'Integrations',
    component: IntegrationsWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    component: MarketingWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 8, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    component: LoyaltyHealthWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER],
  },
  {
    id: 'attention',
    name: 'Attention',
    component: AttentionRequiredWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 12 },
    compactable: true,
    roles: [Role.ADMIN, Role.MANAGER],
  },
];

// Get available widgets for a specific role
export function getAvailableWidgets(role: Role) {
  return widgets.filter((widget) => widget.roles.includes(role));
}
