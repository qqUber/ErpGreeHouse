import React from 'react';
import { useTranslation } from 'react-i18next';
import { Role } from '../../types/roles';
import { WidgetGrid } from '../WidgetGrid';
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
  const role = Role.MANAGER;
  const widgets = getAvailableWidgets(role);
  const widgetData = {
    customers: data?.customers,
    products: data?.products,
    sales: data?.operational,
    integrations: data?.integrations,
    marketing: data?.marketing,
    analytics: data,
  };

  return (
    <div className="manager-dashboard">
      <h1 className="dashboard-title">{t('dashboard.title')}</h1>
      <WidgetGrid role={role} widgets={widgets} data={widgetData} />
    </div>
  );
}
