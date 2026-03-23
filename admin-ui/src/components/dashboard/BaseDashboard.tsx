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
  if (!data) {
    return {
      sales: { revenue: 0, transactions: 0, avgCheck: 0, peakHour: null, peakHourTransactions: 0, topProducts: [] },
      customers: { totalCustomers: 0, newCustomers: 0, repeatCustomers: 0, reachableCustomers: 0, consentRate: 0, topCustomers: [], priorityActions: [] },
      products: { totalProducts: 0, topProducts: [], categoryTrend: [], topProductName: '—' },
      marketing: { activeCampaigns: 0, upcomingCount: 0, needsAttention: 0, messagesSent24h: 0, recentEvents: [] },
      loyalty: { pointsEarned: 0, pointsRedeemed: 0, redemptionRate: 0, avgOrderValue: 0, revenue: 0 },
      attention: { items: [], priority: null },
      integrations: { integrations: [], recentDeliveries: [], deliveryStats24h: {}, successRate: 0, pendingCount: 0 },
    };
  }

  return {
    sales: {
      revenue: data.salesCard?.revenue ?? 0,
      transactions: data.salesCard?.transactions ?? 0,
      avgCheck: data.salesCard?.avgCheck ?? 0,
      peakHour: data.salesCard?.peakHour ?? null,
      peakHourTransactions: data.salesCard?.peakHourTransactions ?? 0,
      topProducts: data.salesCard?.topProducts ?? [],
    },
    customers: {
      totalCustomers: data.customerCard?.totalCustomers ?? 0,
      newCustomers: data.customerCard?.newCustomers ?? 0,
      repeatCustomers: data.customerCard?.repeatCustomers ?? 0,
      reachableCustomers: data.customerCard?.reachableCustomers ?? 0,
      consentRate: data.customerCard?.consentRate ?? 0,
      topCustomers: data.customerCard?.topCustomers ?? [],
      priorityActions: data.customerCard?.priorityActions ?? [],
    },
    products: {
      totalProducts: data.topProductsCard?.totalProducts ?? 0,
      topProducts: data.topProductsCard?.topProducts ?? [],
      categoryTrend: data.topProductsCard?.categoryTrend ?? [],
      topProductName: data.topProductsCard?.topProductName ?? '—',
    },
    marketing: {
      activeCampaigns: data.campaignPulseCard?.activeCampaigns ?? 0,
      upcomingCount: data.campaignPulseCard?.upcomingCount ?? 0,
      needsAttention: data.campaignPulseCard?.needsAttention ?? 0,
      messagesSent24h: data.campaignPulseCard?.messagesSent24h ?? 0,
      recentEvents: data.campaignPulseCard?.recentEvents ?? [],
    },
    loyalty: {
      pointsEarned: data.loyaltyCard?.pointsEarned ?? 0,
      pointsRedeemed: data.loyaltyCard?.pointsRedeemed ?? 0,
      redemptionRate: data.loyaltyCard?.redemptionRate ?? 0,
      avgOrderValue: data.loyaltyCard?.avgOrderValue ?? 0,
      revenue: data.loyaltyCard?.revenue ?? 0,
    },
    attention: {
      items: data.attentionRequiredCard?.items ?? [],
      priority: data.attentionRequiredCard?.priority ?? null,
    },
    integrations: {
      integrations: data.integrationsCard?.integrations ?? [],
      recentDeliveries: data.integrationsCard?.recentDeliveries ?? [],
      deliveryStats24h: data.integrationsCard?.deliveryStats24h ?? {},
      successRate: data.integrationsCard?.successRate ?? 0,
      pendingCount: data.integrationsCard?.pendingCount ?? 0,
    },
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
