import { ReactNode } from 'react';

interface EmptyStateProps {
  /** Icon or illustration */
  icon?: ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Call to action button */
  action?: ReactNode;
  /** Alternative action (secondary) */
  secondaryAction?: ReactNode;
  /** Additional content */
  children?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state-${size}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {children && <div className="empty-state-content">{children}</div>}
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && <div className="empty-state-action">{action}</div>}
          {secondaryAction && <div className="empty-state-secondary">{secondaryAction}</div>}
        </div>
      )}
    </div>
  );
}

// Common empty state examples
export function EmptyStateNoData({ 
  onRefresh, 
  message = "No data available" 
}: { 
  onRefresh?: () => void;
  message?: string;
}) {
  return (
    <EmptyState
      icon={<span style={{ fontSize: '48px' }}>📊</span>}
      title={message}
      description="There is no data to display yet. Data will appear here once available."
      action={
        onRefresh ? (
          <button className="btn" onClick={onRefresh}>
            ↻ Refresh
          </button>
        ) : undefined
      }
    />
  );
}

export function EmptyStateNoResults({ 
  onClear, 
  searchQuery 
}: { 
  onClear?: () => void;
  searchQuery?: string;
}) {
  return (
    <EmptyState
      icon={<span style={{ fontSize: '48px' }}>🔍</span>}
      title="No results found"
      description={searchQuery 
        ? `No results for "${searchQuery}". Try different keywords or clear filters.`
        : "No results match your current filters."
      }
      action={
        onClear ? (
          <button className="btn" onClick={onClear}>
            Clear filters
          </button>
        ) : undefined
      }
    />
  );
}

export function EmptyStateAddFirst({ 
  onAdd, 
  title = "Add your first item",
  description = "Get started by creating your first entry."
}: { 
  onAdd: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<span style={{ fontSize: '48px' }}>✨</span>}
      title={title}
      description={description}
      action={
        <button className="btn btnPrimary" onClick={onAdd}>
          + Add New
        </button>
      }
    />
  );
}
