import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

interface AttentionItem {
  id: string;
  title: string;
  value: number;
  tone: string;
  suffix?: string;
}

interface AttentionRequiredData {
  items?: AttentionItem[];
  priority?: AttentionItem | null;
}

export function AttentionRequiredWidget({ data }: { data?: AttentionRequiredData }) {
  const { t } = useTranslation();
  const items = data?.items ?? [];
  const priority = data?.priority ?? items[0] ?? null;

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card crm-kpi-card-danger">
          <span className="crm-kpi-label">{t('widgets.common.attention', 'Attention')}</span>
          <span className="crm-kpi-value">{priority ? priority.value : 0}</span>
        </div>
      </div>
    </div>
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Priority actions</h3>
        <div className="crm-list">
          {items.map((item) => (
            <div key={item.id} className="crm-customer-row">
              <div className="crm-customer-main">
                <span className="crm-customer-name">{item.title}</span>
              </div>
              <div className="crm-customer-badges">
                <span
                  className={`crm-badge ${item.tone === 'danger' ? 'crm-badge-warn' : 'crm-badge-value'}`}
                >
                  {item.value}
                  {item.suffix ?? ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.common.attention', 'Attention Required')}
      drawerTitle="Priority actions"
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="crm-widget-body">
        <div className="crm-inline-stats">
          {items.slice(0, 3).map((item) => (
            <span key={item.id}>
              {item.title}:{' '}
              <strong>
                {item.value}
                {item.suffix ?? ''}
              </strong>
            </span>
          ))}
        </div>
      </div>
    </Widget>
  );
}
