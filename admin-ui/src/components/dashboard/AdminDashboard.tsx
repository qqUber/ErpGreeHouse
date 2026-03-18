import { useEffect, useState } from 'react';
import { Api } from '../../api';
import { useAuth } from '../../stores/auth';
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
    dashboard?: any; // Добавляем dashboard данные с KPI
  } | null;
  onNavigate?: (tab: string, params?: Record<string, string | number>) => void;
}

export function AdminDashboard({ data, onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [marketingAnalytics, setMarketingAnalytics] = useState<MarketingAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const role = (user?.role?.toLowerCase() || Role.ADMIN) as Role;
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
    ...data, // Spread all dashboard data directly
    analytics: marketingAnalytics, // Use real marketing analytics data
  };

  console.log('AdminDashboard widgetData:', widgetData);

  return (
    <div className="admin-dashboard">
      <WidgetGrid role={role} widgets={widgets} data={widgetData} />
    </div>
  );
}
