import type { ReactNode } from 'react';
import './StatCard.css';

export interface StatCardProps {
  value: string | number;
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'info';
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  value,
  label,
  variant = 'primary',
  icon,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`stat-card stat-card-${variant} ${className}`}
      data-testid={`stat-card-${variant}`}
    >
      <div className="stat-card-content">
        {icon && <div className="stat-card-icon">{icon}</div>}
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </div>
  );
}
