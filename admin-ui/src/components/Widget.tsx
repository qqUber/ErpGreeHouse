import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import EZDrawer from 'react-modern-drawer';
import 'react-modern-drawer/dist/index.css';
import { WidgetProps } from '../types/widgets';

interface Props extends WidgetProps {
  title: string;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  compactContent?: React.ReactNode;
  drawerTitle?: string;
}

export function Widget({
  title,
  children,
  expandedContent,
  compactContent,
  onExpand,
  onCollapse,
  isExpanded: controlledIsExpanded,
  drawerTitle,
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
    console.log('Widget handleToggle:', {
      current: isExpanded,
      newState,
      hasOnExpand: !!onExpand,
      hasOnCollapse: !!onCollapse,
    });
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
            className="widget-toggle-icon"
            onClick={handleToggle}
            type="button"
            data-testid="widget-toggle-button"
            aria-label={isExpanded ? t('widgets.hideDetails') : t('widgets.showDetails')}
          >
            <span className="widget-toggle-label">{isExpanded ? 'Close' : 'Details'}</span>
            <svg
              className={`arrow-icon ${isExpanded ? 'rotated' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 2L10 6L6 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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

      {isExpanded &&
        expandedContent &&
        createPortal(
          <EZDrawer
            open={isExpanded}
            onClose={() => handleToggle()}
            direction="right"
            size={drawerSize}
            className="widget-drawer"
            data-testid="widget-drawer"
          >
            <div className="drawer-content">
              <div className="drawer-header">
                <h2 className="drawer-title">
                  {drawerTitle ?? `${title} ${t('widgets.detailsSuffix')}`}
                </h2>
                <button
                  className="drawer-close"
                  onClick={handleToggle}
                  type="button"
                  aria-label={t('common.close')}
                >
                  {t('common.back')}
                </button>
              </div>
              {expandedContent}
            </div>
          </EZDrawer>,
          document.body
        )}
    </div>
  );
}
