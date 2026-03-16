import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Api } from '../../api';
import { Role } from '../../types/roles';
import { WidgetGrid } from '../WidgetGrid';
import type { MarketingAnalyticsData } from './AnalyticsWidget';
import { getAvailableWidgets } from './widgetRegistry';

interface DashboardProps {
  data?: {
    operational?: any;
    customers?: any;
    products?: any;
    marketing?: any;
    integrations?: any;
  } | null;
  onNavigate?: (tab: string, params?: Record<string, string | number>) => void;
}

export function ManagerDashboard({ data, onNavigate }: DashboardProps) {
  const { t } = useTranslation();
  const [marketingAnalytics, setMarketingAnalytics] = useState<MarketingAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const role = Role.MANAGER;
  const widgets = getAvailableWidgets(role);
  
  useEffect(() => {
    const fetchMarketingAnalytics = async () => {
      try {
        const analytics = await Api.marketingAnalytics();
        setMarketingAnalytics(analytics);
      } catch (error) {
        console.error('Failed to fetch marketing analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMarketingAnalytics();
  }, []);
  
  const widgetData = {
    customers: data?.customers,
    products: data?.products,
    sales: data?.operational,
    integrations: data?.integrations,
    marketing: data?.marketing,
    analytics: marketingAnalytics, // Use real marketing analytics data
  };

  return (
    <div className="manager-dashboard">
      <h1 className="dashboard-title">{t('dashboard.title')}</h1>
      <WidgetGrid role={role} widgets={widgets} data={widgetData} />
    </div>
  );
}
