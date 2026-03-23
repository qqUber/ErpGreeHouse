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

  const total = Number(data?.totalCustomers ?? 0);
  const newWeek = Number(data?.newCustomers ?? 0);
  const customers = data?.topCustomers ?? [];
  const reachableCustomers = Number(data?.reachableCustomers ?? 0);
  const telegramReachable = customers.filter((c: any) => Boolean(c.telegram_id)).length;
  const vkReachable = customers.filter((c: any) => Boolean(c.vk_id)).length;
  const consentCount = Math.round((Number(data?.consentRate ?? 0) / 100) * total);
  const consentRate = total > 0 ? Math.round((consentCount / total) * 100) : 0;
  const derivedReachable = customers.filter((c: any) => Boolean(c.telegram_id) || Boolean(c.vk_id));
  const highValueThreshold = Math.max(1, Number(data?.highValueThreshold ?? 15000));
  const highValue = customers.filter((c: any) => Number(c.ltv ?? c.total_spent ?? 0) >= highValueThreshold);
  const recentlyActive = customers
    .slice()
    .sort((a: any, b: any) => Number(b.transactions ?? 0) - Number(a.transactions ?? 0))
    .slice(0, 5);
  const gaps = customers.filter((c: any) => !c.marketing_allowed || (!c.telegram_id && !c.vk_id));
  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId) ?? null;

  const compactContent = (
    <div className="kpi-grid-2026 animate-fade-in-up">
      <div className="kpi-card-2026">
        <div className="kpi-value-2026 text-indigo-600">{total}</div>
        <div className="kpi-label-2026">{t('widgets.customers.totalCustomers')}</div>
      </div>
      <div className="kpi-card-2026">
        <div className="kpi-value-2026 text-blue-600">{telegramReachable}</div>
        <div className="kpi-label-2026">{t('widgets.customers.telegram')}</div>
      </div>
      <div className="kpi-card-2026">
        <div className="kpi-value-2026 text-purple-600">{vkReachable}</div>
        <div className="kpi-label-2026">{t('widgets.customers.vk')}</div>
      </div>
      <div className="kpi-card-2026">
        <div className="kpi-value-2026 text-green-600">{consentRate}%</div>
        <div className="kpi-label-2026">{t('analytics.consentRate')}</div>
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
        className="row-item-2026"
        onClick={() => setSelectedCustomerId(id)}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-500">#{id}</span>
          <span className="font-medium">
            {customer.name ?? t('widgets.customers.unknown')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasTelegram && (
            <span className="badge-2026 badge-2026-primary">{t('widgets.customers.telegram')}</span>
          )}
          {hasVk && (
            <span className="badge-2026 badge-2026-info">{t('widgets.customers.vk')}</span>
          )}
          {!hasTelegram && !hasVk && (
            <span className="badge-2026" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}>{t('widgets.customers.noChannel')}</span>
          )}
          <span className={`badge-2026 ${consent ? 'badge-2026-success' : 'badge-2026-warning'}`}>
            {consent ? t('widgets.customers.consent') : t('widgets.customers.noConsent')}
          </span>
          <span className="badge-2026 badge-2026-primary">
            {t('widgets.customers.ltv')} {ltv.toLocaleString()}
          </span>
        </div>
      </button>
    );
  };

  const expandedContent = (
    <div className="dashboard-widget-2026">
      {selectedCustomer ? (
        <section className="stat-card-2026 stat-card-2026-primary mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title-2026">Customer Profile</h3>
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-700"
              onClick={() => setSelectedCustomerId(null)}
            >
              ← Back to list
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">ID</div>
              <div className="font-mono text-lg">#{selectedCustomer.id ?? '-'}</div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">Name</div>
              <div className="font-medium text-lg">{selectedCustomer.name ?? '-'}</div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">Phone</div>
              <div className="text-lg">{selectedCustomer.phone ?? '-'}</div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">Telegram</div>
              <div className={`text-lg ${selectedCustomer.telegram_id ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                {selectedCustomer.telegram_id ?? 'No'}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">VK</div>
              <div className={`text-lg ${selectedCustomer.vk_id ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
                {selectedCustomer.vk_id ?? 'No'}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">Consent</div>
              <div className={`text-lg ${selectedCustomer.marketing_allowed !== false ? 'text-green-600' : 'text-red-600'}`}>
                {selectedCustomer.marketing_allowed !== false ? 'Allowed' : 'Denied'}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">Balance</div>
              <div className="text-xl font-bold text-indigo-600">
                {Number(selectedCustomer.balance_points ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">LTV</div>
              <div className="text-xl font-bold text-green-600">
                {Number(selectedCustomer.ltv ?? selectedCustomer.total_spent ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-xs text-gray-500 uppercase">Last purchase</div>
              <div className="text-lg">{selectedCustomer.last_purchase_date ?? '-'}</div>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="mb-4">
            <h3 className="section-title-2026">High value customers</h3>
            <div className="space-y-2">
              {highValue.length ? (
                highValue.map(renderCustomerRow)
              ) : (
                <p className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">No high-value customers in payload.</p>
              )}
            </div>
          </section>
          <section className="mb-4">
            <h3 className="section-title-2026">Recently active customers</h3>
            <div className="space-y-2">
              {recentlyActive.length ? (
                recentlyActive.map(renderCustomerRow)
              ) : (
                <p className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">No recent activity data.</p>
              )}
            </div>
          </section>
          <section className="mb-4">
            <h3 className="section-title-2026">Consent gaps / unreachable</h3>
            <div className="space-y-2">
              {gaps.length ? (
                gaps.map(renderCustomerRow)
              ) : (
                <p className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">No consent or reachability gaps.</p>
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
      <div className="dashboard-widget-2026 p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">{t('widgets.common.newThisWeek')}</div>
            <div className="font-semibold text-green-600">{newWeek}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Reachable</div>
            <div className="font-semibold text-blue-600">{reachableCustomers || derivedReachable.length}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">{t('analytics.consentRate')}</div>
            <div className="font-semibold text-indigo-600">{consentRate}%</div>
          </div>
        </div>
        <div className="space-y-2">
          {customers.slice(0, 3).map(renderCustomerRow)}
        </div>
      </div>
    </Widget>
  );
}
