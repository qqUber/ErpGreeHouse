import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EZDrawer from 'react-modern-drawer';
import { WidgetProps } from '../types/widgets';
import 'react-modern-drawer/dist/index.css';

interface Props extends WidgetProps {
  title: string;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  compactContent?: React.ReactNode;
}

export function Widget({
  title,
  children,
  expandedContent,
  compactContent,
  onExpand,
  onCollapse,
  isExpanded: controlledIsExpanded,
}: Props) {
  const { t } = useTranslation();
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [drawerSize, setDrawerSize] = useState<string>('50%');

  useEffect(() => {
    const syncDrawerSize = () => {
      setDrawerSize(window.innerWidth < 768 ? '96%' : '50%');
    };
    syncDrawerSize();
    window.addEventListener('resize', syncDrawerSize);
    return () => window.removeEventListener('resize', syncDrawerSize);
  }, []);

  const isExpanded = controlledIsExpanded ?? internalIsExpanded;

  const handleToggle = () => {
    const newState = !isExpanded;
    setInternalIsExpanded(newState);
    if (newState) {
      onExpand?.();
    } else {
      onCollapse?.();
    }
  };

  return (
    <div
      className="widget-container"
      data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="widget-header">
        <h3 className="widget-title">{title}</h3>
        {expandedContent && (
          <button
            className="widget-toggle"
            onClick={handleToggle}
            data-testid="widget-toggle-button"
          >
            {isExpanded ? t('widgets.hideDetails') : t('widgets.showDetails')}
          </button>
        )}
      </div>

      {compactContent && !isExpanded ? (
        <div className="widget-compact" data-testid="widget-compact-content">
          {compactContent}
        </div>
      ) : (
        <div className="widget-expanded" data-testid="widget-expanded-content">
          {children}
        </div>
      )}

      {isExpanded && expandedContent && (
        <EZDrawer
          open={isExpanded}
          onClose={() => handleToggle()}
          direction="right"
          size={drawerSize}
          className="widget-drawer"
          data-testid="widget-drawer"
        >
          <div className="drawer-content">
            <h2 className="drawer-title">
              {title} {t('widgets.detailsSuffix')}
            </h2>
            {expandedContent}
          </div>
        </EZDrawer>
      )}
    </div>
  );
}
