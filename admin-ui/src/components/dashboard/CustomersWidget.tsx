import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  console.log('CustomersWidget data:', data);

  const total = Number(data?.customers_total ?? 0);
  const newWeek = Number(data?.new_customers?.this_week ?? 0);
  const customers = data?.top_customers ?? [];
  const telegramReachable = Number(data?.telegram_reachable ?? 0);
  const vkReachable = Number(data?.vk_reachable ?? 0);
  const consentCount = Number(data?.marketing_consent ?? 0);
  const consentRate = total > 0 ? Math.round((consentCount / total) * 100) : 0;
  const derivedReachable = customers.filter((c: any) => Boolean(c.telegram_id) || Boolean(c.vk_id));
  const highValue = customers.filter((c: any) => Number(c.ltv ?? c.total_spent ?? 0) >= 15000);
  const recentlyActive = customers
    .slice()
    .sort((a: any, b: any) => Number(b.transactions ?? 0) - Number(a.transactions ?? 0))
    .slice(0, 5);
  const gaps = customers.filter((c: any) => !c.marketing_allowed || (!c.telegram_id && !c.vk_id));
  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId) ?? null;

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">{t('widgets.customers.totalCustomers')}</span>
          <span className="crm-kpi-value">{total}</span>
        </div>
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">{t('widgets.customers.telegram')}</span>
          <span className="crm-kpi-value">{telegramReachable}</span>
        </div>
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">{t('widgets.customers.vk')}</span>
          <span className="crm-kpi-value">{vkReachable}</span>
        </div>
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">{t('analytics.consentRate')}</span>
          <span className="crm-kpi-value">{consentRate}%</span>
        </div>
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
      <button
        key={`${id}-${customer.name ?? 'customer'}`}
        type="button"
        className="crm-customer-row"
        onClick={() => setSelectedCustomerId(id)}
      >
        <div className="crm-customer-main">
          <span className="crm-customer-id">#{id}</span>
          <span className="crm-customer-name">
            {customer.name ?? t('widgets.customers.unknown')}
          </span>
        </div>
        <div className="crm-customer-badges">
          {hasTelegram && (
            <span className="crm-badge crm-badge-channel">{t('widgets.customers.telegram')}</span>
          )}
          {hasVk && (
            <span className="crm-badge crm-badge-channel">{t('widgets.customers.vk')}</span>
          )}
          {!hasTelegram && !hasVk && (
            <span className="crm-badge crm-badge-muted">{t('widgets.customers.noChannel')}</span>
          )}
          <span className={`crm-badge ${consent ? 'crm-badge-good' : 'crm-badge-warn'}`}>
            {consent ? t('widgets.customers.consent') : t('widgets.customers.noConsent')}
          </span>
          <span className="crm-badge crm-badge-value">
            {t('widgets.customers.ltv')} {ltv.toLocaleString()}
          </span>
        </div>
      </button>
    );
  };

  const expandedContent = (
    <div className="crm-drawer-stack">
      {selectedCustomer ? (
        <section className="crm-detail-card">
          <div className="crm-detail-head">
            <h3 className="crm-section-title">Customer Profile</h3>
            <button
              type="button"
              className="crm-inline-back"
              onClick={() => setSelectedCustomerId(null)}
            >
              Back to list
            </button>
          </div>
          <div className="crm-detail-grid">
            <div>
              <span>ID</span>
              <strong>#{selectedCustomer.id ?? '-'}</strong>
            </div>
            <div>
              <span>Name</span>
              <strong>{selectedCustomer.name ?? '-'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{selectedCustomer.phone ?? '-'}</strong>
            </div>
            <div>
              <span>Telegram</span>
              <strong>{selectedCustomer.telegram_id ?? 'No'}</strong>
            </div>
            <div>
              <span>VK</span>
              <strong>{selectedCustomer.vk_id ?? 'No'}</strong>
            </div>
            <div>
              <span>Consent</span>
              <strong>{selectedCustomer.marketing_allowed !== false ? 'Allowed' : 'Denied'}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong>{Number(selectedCustomer.balance_points ?? 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>LTV</span>
              <strong>
                {Number(selectedCustomer.ltv ?? selectedCustomer.total_spent ?? 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span>Last purchase</span>
              <strong>{selectedCustomer.last_purchase_date ?? '-'}</strong>
            </div>
          </div>
        </section>
      ) : (
        <div className="crm-drawer-stack">
          <section className="crm-collapsible-section">
            <h3 className="crm-section-title">High value customers</h3>
            <div className="crm-list">
              {highValue.length ? (
                highValue.map(renderCustomerRow)
              ) : (
                <p className="crm-empty-state">No high-value customers in payload.</p>
              )}
            </div>
          </section>
          <section className="crm-collapsible-section">
            <h3 className="crm-section-title">Recently active customers</h3>
            <div className="crm-list">
              {recentlyActive.length ? (
                recentlyActive.map(renderCustomerRow)
              ) : (
                <p className="crm-empty-state">No recent activity data.</p>
              )}
            </div>
          </section>
          <section className="crm-collapsible-section">
            <h3 className="crm-section-title">Consent gaps / unreachable</h3>
            <div className="crm-list">
              {gaps.length ? (
                gaps.map(renderCustomerRow)
              ) : (
                <p className="crm-empty-state">No consent or reachability gaps.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );

  return (
    <Widget
      title={t('widgets.customers.title')}
      drawerTitle={selectedCustomer ? 'Customer detail' : 'Customer CRM details'}
      isExpanded={isExpanded}
      onExpand={() => {
        setSelectedCustomerId(null);
        setIsExpanded(true);
      }}
      onCollapse={() => {
        setSelectedCustomerId(null);
        setIsExpanded(false);
      }}
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="crm-widget-body">
        <div className="crm-inline-stats">
          <span>
            {t('widgets.common.newThisWeek')}: <strong>{newWeek}</strong>
          </span>
          <span>
            Reachable: <strong>{derivedReachable.length}</strong>
          </span>
          <span>
            {t('analytics.consentRate')}: <strong>{consentRate}%</strong>
          </span>
        </div>
        <div className="crm-list-preview">{customers.slice(0, 3).map(renderCustomerRow)}</div>
      </div>
    </Widget>
  );
}
