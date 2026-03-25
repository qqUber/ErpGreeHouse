import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';
import { StatCard } from '../ui/StatCard';

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
  const attentionLabel = t('widgets.attentionRequired.attention', 'Attention');
  const sectionTitle = t('widgets.attentionRequired.title', 'Attention Required');
  const detailTitle = t('widgets.attentionRequired.details', 'Priority actions and analytics');

  const actionOptions = [
    {
      title: t('widgets.attentionRequired.actionFast', 'Fast action'),
      description: t('widgets.attentionRequired.actionFastDesc', 'Handle urgent cases with the highest business impact first.'),
    },
    {
      title: t('widgets.attentionRequired.actionSegment', 'Segmented review'),
      description: t('widgets.attentionRequired.actionSegmentDesc', 'Group records by risk, value, and channel reachability before outreach.'),
    },
    {
      title: t('widgets.attentionRequired.actionNurture', 'Nurture flow'),
      description: t('widgets.attentionRequired.actionNurtureDesc', 'Move non-urgent items into a follow-up cadence with clear ownership.'),
    },
  ];

  const bestPractices = [
    t('widgets.attentionRequired.bestPractice1', 'Prioritize by urgency, value, and contactability.'),
    t('widgets.attentionRequired.bestPractice2', 'Keep one owner per action to avoid duplicated follow-up.'),
    t('widgets.attentionRequired.bestPractice3', 'Use channel-aware messaging for Telegram, VK, and phone.'),
  ];

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-kpi-grid">
        <StatCard variant="warning" value={(priority ? priority.value : 0).toLocaleString()} label={attentionLabel} className="stat-card-gradient stat-card-gradient-warning" />
      </div>
    </div>
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">{detailTitle}</h3>
        <div className="crm-list">
          {items.length ? (
            items.map((item) => (
              <div key={item.id} className="crm-customer-row">
                <div className="crm-customer-main">
                  <span className="crm-customer-name">{item.title}</span>
                  <span className="crm-customer-id">{item.tone === 'danger' ? 'Critical priority' : 'Watchlist item'}</span>
                </div>
                <div className="crm-customer-badges">
                  <span
                    className={`crm-badge ${item.tone === 'danger' ? 'crm-badge-warn' : 'crm-badge-value'}`}
                  >
                    {item.value.toLocaleString()}
                    {item.suffix ?? ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="crm-empty-state">No attention items in payload.</p>
          )}
        </div>
      </section>

      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Action options</h3>
        <div className="crm-list">
          {actionOptions.map((option) => (
            <div key={option.title} className="crm-customer-row">
              <div className="crm-customer-main">
                <span className="crm-customer-name">{option.title}</span>
                <span className="crm-customer-id">{option.description}</span>
              </div>
              <div className="crm-customer-badges">
                <span className="crm-badge crm-badge-value">Action</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">CRM best practices</h3>
        <div className="crm-list">
          {bestPractices.map((practice) => (
            <div key={practice} className="crm-customer-row">
              <div className="crm-customer-main">
                <span className="crm-customer-name">{practice}</span>
              </div>
              <div className="crm-customer-badges">
                <span className="crm-badge crm-badge-good">Best practice</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={sectionTitle}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
