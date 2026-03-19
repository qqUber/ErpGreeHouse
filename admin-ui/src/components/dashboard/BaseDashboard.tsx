import {
  DashboardHomeViewModel,
  dashboardAnalyticsService,
} from '../../services/dashboard-analytics.service';
import { Role } from '../../types/roles';
import { WidgetGrid } from '../WidgetGrid';
import { getAvailableWidgets } from './widgetRegistry';

interface BaseDashboardProps {
  data: DashboardHomeViewModel | null;
  role: Role;
}

function buildWidgetData(data: DashboardHomeViewModel | null) {
  return {
    sales: data?.salesCard,
    customers: data?.customerCard,
    products: data?.topProductsCard,
    marketing: data?.campaignPulseCard,
    loyalty: data?.loyaltyCard,
    attention: data?.attentionRequiredCard,
    integrations: data?.integrationsCard,
  };
}

export function BaseDashboard({ data, role }: BaseDashboardProps) {
  const visibleWidgetIds = dashboardAnalyticsService.getVisibleWidgetIds(role);
  const widgets = getAvailableWidgets(role).filter((widget) =>
    visibleWidgetIds.includes(widget.id)
  );
  const widgetData = buildWidgetData(data);

  return (
    <div className={`${role}-dashboard`}>
      <WidgetGrid role={role} widgets={widgets} data={widgetData} />
    </div>
  );
}
