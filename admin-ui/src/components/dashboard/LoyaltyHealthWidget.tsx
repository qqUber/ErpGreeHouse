import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';
import { StatCard } from '../ui/StatCard';

interface LoyaltyHealthData {
  pointsEarned?: number;
  pointsRedeemed?: number;
  redemptionRate?: number;
  avgOrderValue?: number;
  revenue?: number;
}

export function LoyaltyHealthWidget({ data }: { data?: LoyaltyHealthData }) {
  const { t } = useTranslation();
  const pointsEarned = Number(data?.pointsEarned ?? 0);
  const pointsRedeemed = Number(data?.pointsRedeemed ?? 0);
  const redemptionRate = Number(data?.redemptionRate ?? 0);
  const avgOrderValue = Number(data?.avgOrderValue ?? 0);
  const redemptionLabel = t('widgets.loyaltyHealth.redemptionRate', 'Redemption rate');
  const earnedLabel = t('widgets.loyaltyHealth.earned', 'Points earned');
  const redeemedLabel = t('widgets.loyaltyHealth.redeemed', 'Points redeemed');

  const renderSummaryMetric = (label: string, value: React.ReactNode, helper?: string, tone: 'primary' | 'success' | 'warning' | 'info' = 'primary') => (
    <StatCard value={value as any} label={label} variant={tone} className={`stat-card-gradient stat-card-gradient-${tone}`} />
  );

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-summary-grid">
        {renderSummaryMetric(earnedLabel, pointsEarned.toLocaleString(), 'Issued points', 'primary')}
        {renderSummaryMetric(redeemedLabel, pointsRedeemed.toLocaleString(), 'Used points', 'success')}
      </div>
    </div>
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">{t('widgets.loyaltyHealth.title', 'Loyalty Health')}</h3>
        <div className="crm-list">
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{earnedLabel}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-value">{pointsEarned.toLocaleString()}</span><span className="crm-badge crm-badge-muted">Issued points</span></div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{redeemedLabel}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-good">{pointsRedeemed.toLocaleString()}</span><span className="crm-badge crm-badge-muted">Used points</span></div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{redemptionLabel}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-warn">{redemptionRate.toFixed(1)}%</span><span className="crm-badge crm-badge-muted">Redemption performance</span></div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{t('widgets.loyaltyHealth.avgOrder', 'Avg order value')}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-value">{avgOrderValue.toLocaleString()}</span><span className="crm-badge crm-badge-muted">Average ticket value</span></div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.loyalty.title', 'Loyalty Health')}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
