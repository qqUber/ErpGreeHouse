import type { DashboardHomeViewModel } from '../../services/dashboard-analytics.service';
import { Role } from '../../types/roles';
import { BaseDashboard } from './BaseDashboard';

interface DashboardProps {
  data?: DashboardHomeViewModel | null;
  onNavigate?: (tab: string, params?: Record<string, string | number>) => void;
}

export function OperatorDashboard({ data }: DashboardProps) {
  return <BaseDashboard data={data ?? null} role={Role.OPERATOR} />;
}
