import { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const items = data?.items ?? [];
  const priority = data?.priority ?? items[0] ?? null;

  const compactContent = (
    <div className="animate-fade-in-up">
      <StatCard
        variant="warning"
        value={(priority ? priority.value : 0).toLocaleString()}
        label={t('widgets.attentionRequired.attention')}
        className="stat-card-gradient stat-card-gradient-warning"
      />
    </div>
  );

  const renderAttentionRow = (item: AttentionItem) => (
    <div key={item.id} className="row-item-2026">
      <div className="flex items-center gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="text-sm text-gray-500">
          {item.tone === 'danger'
            ? t('widgets.attentionRequired.criticalPriority')
            : t('widgets.attentionRequired.watchlistItem')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge-2026 ${item.tone === 'danger' ? 'badge-2026-warning' : 'badge-2026-primary'}`}>
          {item.value.toLocaleString()}
          {item.suffix ?? ''}
        </span>
      </div>
    </div>
  );

  const renderActionRow = (option: { title: string; description: string }) => (
    <div key={option.title} className="row-item-2026">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{option.title}</span>
        <span className="text-sm text-gray-500">{option.description}</span>
      </div>
      <span className="badge-2026 badge-2026-primary">
        {t('widgets.attentionRequired.actionBadge')}
      </span>
    </div>
  );

  const renderBestPracticeRow = (practice: string) => (
    <div key={practice} className="row-item-2026">
      <span className="font-medium">{practice}</span>
      <span className="badge-2026 badge-2026-success">
        {t('widgets.attentionRequired.bestPracticeBadge')}
      </span>
    </div>
  );

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <section className="mb-4">
        <h3 className="section-title-2026">{t('widgets.attentionRequired.details')}</h3>
        <div className="space-y-2">
          {items.length ? (
            items.map(renderAttentionRow)
          ) : (
            <div className="crm-empty-state">{t('widgets.attentionRequired.noItems')}</div>
          )}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="section-title-2026">{t('widgets.attentionRequired.actionOptions')}</h3>
        <div className="space-y-2">
          {[
            {
              title: t('widgets.attentionRequired.actionFast'),
              description: t('widgets.attentionRequired.actionFastDesc'),
            },
            {
              title: t('widgets.attentionRequired.actionSegment'),
              description: t('widgets.attentionRequired.actionSegmentDesc'),
            },
            {
              title: t('widgets.attentionRequired.actionNurture'),
              description: t('widgets.attentionRequired.actionNurtureDesc'),
            },
          ].map(renderActionRow)}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="section-title-2026">{t('widgets.attentionRequired.bestPractices')}</h3>
        <div className="space-y-2">
          {[
            t('widgets.attentionRequired.bestPractice1'),
            t('widgets.attentionRequired.bestPractice2'),
            t('widgets.attentionRequired.bestPractice3'),
          ].map(renderBestPracticeRow)}
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.attentionRequired.title')}
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
