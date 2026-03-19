import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

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

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">{t('widgets.loyalty.pointsEarned', 'Earned')}</span>
          <span className="crm-kpi-value">{pointsEarned}</span>
        </div>
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">{t('widgets.loyalty.redeemed', 'Redeemed')}</span>
          <span className="crm-kpi-value">{pointsRedeemed}</span>
        </div>
      </div>
    </div>
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Loyalty health</h3>
        <div className="crm-inline-stats">
          <span>
            Points earned: <strong>{pointsEarned}</strong>
          </span>
          <span>
            Points redeemed: <strong>{pointsRedeemed}</strong>
          </span>
          <span>
            Redemption rate: <strong>{redemptionRate}%</strong>
          </span>
          <span>
            Avg order value: <strong>{avgOrderValue.toLocaleString()}</strong>
          </span>
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.loyalty.title', 'Loyalty Health')}
      drawerTitle="Loyalty health"
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="crm-widget-body">
        <div className="crm-inline-stats">
          <span>
            Redemption: <strong>{redemptionRate}%</strong>
          </span>
          <span>
            Avg order: <strong>{avgOrderValue.toLocaleString()}</strong>
          </span>
        </div>
      </div>
    </Widget>
  );
}
