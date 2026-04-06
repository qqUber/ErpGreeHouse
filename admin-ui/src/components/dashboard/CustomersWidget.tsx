import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type CustomersData = {
  total_customers?: number;
  new_customers?: { this_week?: number };
  top_customers?: Array<{
    id?: number;
    name?: string;
    phone?: string;
    total_spent?: number;
    transactions?: number;
    telegram_id?: number | null;
    vk_id?: number | null;
    marketing_allowed?: boolean;
    balance_points?: number;
    ltv?: number;
    purchase_frequency?: number;
    last_purchase_date?: string;
  }>;
};

export function CustomersWidget({ data }: { data?: any }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const total = Number(data?.totalCustomers ?? 0);
  const newWeek = Number(data?.newCustomers ?? 0);
  const customers = data?.topCustomers ?? [];
  const reachableCustomers = Number(data?.reachableCustomers ?? 0);
  const telegramReachable = customers.filter((c: any) => Boolean(c.telegram_id)).length;
  const vkReachable = customers.filter((c: any) => Boolean(c.vk_id)).length;
  const derivedReachable = customers.filter((c: any) => Boolean(c.telegram_id) || Boolean(c.vk_id));
  const highValueThreshold = Math.max(1, Number(data?.highValueThreshold ?? 15000));
  const dedupeCustomers = (items: any[]) => {
    const seen = new Set<string>();
    return items.filter((customer: any) => {
      const key = `${customer.id ?? 'no-id'}-${customer.phone ?? 'no-phone'}-${customer.name ?? 'no-name'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const uniqueCustomers = dedupeCustomers(customers);
  const uniqueRecentlyActive = dedupeCustomers(
    uniqueCustomers
      .slice()
      .sort((a: any, b: any) => Number(b.transactions ?? 0) - Number(a.transactions ?? 0))
      .slice(0, 5)
  );
  const uniqueGaps = dedupeCustomers(
    uniqueCustomers.filter((c: any) => !c.marketing_allowed || (!c.telegram_id && !c.vk_id))
  );
  const highValueCustomers = uniqueCustomers
    .filter(
      (customer: any) => Number(customer.ltv ?? customer.total_spent ?? 0) >= highValueThreshold
    )
    .slice(0, 5);
  const recentlyActiveCustomers = uniqueRecentlyActive.slice(0, 5);
  const unreachableCustomers = uniqueGaps.slice(0, 5);

  const topCardDefinitions = [
    {
      value: total,
      label: t('widgets.customers.totalCustomers', 'Total Customers'),
      tone: 'indigo',
    },
    {
      value: telegramReachable,
      label: t('widgets.customers.telegram', 'Telegram'),
      tone: 'blue',
    },
    {
      value: vkReachable,
      label: t('widgets.customers.vk', 'VK'),
      tone: 'purple',
    },
  ];

  const renderSummaryMetric = (
    label: string,
    value: React.ReactNode,
    helper?: string,
    tone: 'primary' | 'success' | 'warning' | 'info' = 'primary'
  ) => (
    <div className={`crm-summary-card crm-detail-card--accent-${tone}`}>
      <div className="crm-summary-label">{label}</div>
      <div className="crm-summary-value">{value}</div>
      {helper ? <div className="crm-summary-helper">{helper}</div> : null}
    </div>
  );

  const compactContent = (
    <div className="space-y-4 animate-fade-in-up">
      <div className="kpi-grid-2026">
        {topCardDefinitions.map((card) => (
          <StatCard
            key={card.label}
            value={card.value.toLocaleString()}
            label={card.label}
            variant={
              card.tone === 'green'
                ? 'success'
                : card.tone === 'blue'
                  ? 'info'
                  : card.tone === 'purple'
                    ? 'primary'
                    : 'primary'
            }
            className={`stat-card-gradient stat-card-gradient-${card.tone}`}
          />
        ))}
      </div>
      <div className="crm-summary-grid">
        <StatCard
          value={newWeek.toLocaleString()}
          label={t('widgets.customers.newThisWeek', 'New this week')}
          variant="primary"
          className="stat-card-gradient stat-card-gradient-primary"
        />
        <StatCard
          value={(reachableCustomers || derivedReachable.length).toLocaleString()}
          label={t('widgets.customers.reachable', 'Reachable audience')}
          variant="info"
          className="stat-card-gradient stat-card-gradient-info"
        />
      </div>
    </div>
  );

  const renderCustomerRow = (customer: any) => {
    const id = Number(customer.id ?? 0);
    const hasTelegram = Boolean(customer.telegram_id);
    const hasVk = Boolean(customer.vk_id);
    const consent = customer.marketing_allowed !== false;
    const ltv = Number(customer.ltv ?? customer.total_spent ?? 0);
    return (
      <div key={`${id}-${customer.name ?? 'customer'}`} className="row-item-2026">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-500">#{id}</span>
          <span className="font-medium">{customer.name ?? t('widgets.customers.unknown')}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasTelegram && (
            <span className="badge-2026 badge-2026-primary">{t('widgets.customers.telegram')}</span>
          )}
          {hasVk && <span className="badge-2026 badge-2026-info">{t('widgets.customers.vk')}</span>}
          {!hasTelegram && !hasVk && (
            <span
              className="badge-2026"
              style={{ background: 'var(--brand-light)', color: 'var(--muted)' }}
            >
              {t('widgets.customers.noChannel')}
            </span>
          )}
          <span className={`badge-2026 ${consent ? 'badge-2026-success' : 'badge-2026-warning'}`}>
            {consent ? t('widgets.customers.consent') : t('widgets.customers.noConsent')}
          </span>
          <span className="badge-2026 badge-2026-primary">
            {t('widgets.customers.ltv')} {ltv.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <section className="mb-4">
        <h3 className="section-title-2026">
          {t('widgets.customers.highValueTitle', 'High value customers')}
        </h3>
        <div className="space-y-2">
          {highValueCustomers.length ? (
            highValueCustomers.map(renderCustomerRow)
          ) : (
            <div className="crm-empty-state">
              {t('widgets.customers.noHighValue', 'No high-value customers in payload.')}
            </div>
          )}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="section-title-2026">
          {t('widgets.customers.recentlyActiveTitle', 'Recently active customers')}
        </h3>
        <div className="space-y-2">
          {recentlyActiveCustomers.length ? (
            recentlyActiveCustomers.map(renderCustomerRow)
          ) : (
            <div className="crm-empty-state">
              {t('widgets.customers.noRecent', 'No recent activity data.')}
            </div>
          )}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="section-title-2026">
          {t('widgets.customers.unreachableTitle', 'Consent gaps / unreachable')}
        </h3>
        <div className="space-y-2">
          {unreachableCustomers.length ? (
            unreachableCustomers.map(renderCustomerRow)
          ) : (
            <div className="crm-empty-state">
              {t('widgets.customers.noGaps', 'No consent or reachability gaps.')}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.customers.title')}
      isExpanded={isExpanded}
      onExpand={() => {
        setIsExpanded(true);
      }}
      onCollapse={() => {
        setIsExpanded(false);
      }}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
