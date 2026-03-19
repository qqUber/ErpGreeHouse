import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useViewportMode } from '../hooks/useViewportMode';
import { useWidgetLayout } from '../hooks/useWidgetLayout';
import { WidgetPosition } from '../types/widgets';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetGridProps {
  role: string;
  widgets: Array<{
    id: string;
    component: React.ComponentType<any>;
    compactable?: boolean;
    defaultSize?: { w: number; h: number };
    minSize?: { w: number; h: number };
    maxSize?: { w: number; h: number };
  }>;
  onLayoutChange?: (layout: WidgetPosition[]) => void;
  data?: Record<string, any>;
}

export function WidgetGrid({ role, widgets, onLayoutChange, data }: WidgetGridProps) {
  const { getLayout, saveLayout } = useWidgetLayout();
  const viewport = useViewportMode();
  const initialLayout = getLayout(role);
  const defaultLayout = widgets.map((widget, index) => ({
    i: widget.id,
    x: (index * 4) % 12,
    y: Math.floor((index * 4) / 12) * 3,
    w: widget.defaultSize?.w ?? 4,
    h: widget.defaultSize?.h ?? 3,
    minW: widget.minSize?.w ?? 2,
    minH: widget.minSize?.h ?? 2,
    maxW: widget.maxSize?.w ?? 8,
    maxH: widget.maxSize?.h ?? 12,
  }));

  const handleLayoutChange = (_layout: any[], allLayouts: Record<string, any[]>) => {
    const lgLayout = allLayouts?.lg && allLayouts.lg.length > 0 ? allLayouts.lg : _layout;
    const positions: WidgetPosition[] = lgLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      maxW: item.maxW,
      maxH: item.maxH,
      widgetId: item.i,
    }));
    // Persist only desktop layout to avoid corrupted positions after mobile resize.
    saveLayout(role, positions);
    onLayoutChange?.(positions);
  };

  return (
    <ResponsiveGridLayout
      className="layout dashboard-grid"
      layouts={{ lg: initialLayout.length > 0 ? initialLayout : defaultLayout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as { [key: string]: number }}
      rowHeight={viewport.mode === 'mobile' ? 76 : viewport.mode === 'tablet' ? 86 : 96}
      margin={viewport.mode === 'mobile' ? [8, 8] : [12, 12]}
      containerPadding={viewport.mode === 'mobile' ? [0, 0] : [4, 4]}
      compactType="vertical"
      preventCollision={false}
      draggableHandle=".widget-header"
      draggableCancel=".widget-toggle-icon, .widget-toggle-icon *, button, input, textarea, select, option, a, [role='button']"
      onLayoutChange={handleLayoutChange}
    >
      {widgets.map((widget) => {
        const WidgetComponent = widget.component;
        const widgetData = data?.[widget.id];
        return (
          <div
            key={widget.id}
            className="dashboard-grid-item"
            data-testid={`grid-widget-${widget.id}`}
          >
            <WidgetComponent
              data={widgetData}
              expandedContent={widgetData?.expandedContent}
              compactContent={widgetData?.compactContent}
            />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
