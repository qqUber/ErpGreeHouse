import { useEffect, useState } from 'react';
import { WidgetPosition } from '../types/widgets';

export function useWidgetLayout() {
  const [layouts, setLayouts] = useState<Record<string, WidgetPosition[]>>({});
  const layoutStorageKey = 'dashboardLayouts_v3';

  useEffect(() => {
    const savedLayouts = localStorage.getItem(layoutStorageKey);
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts));
    }
  }, []);

  const saveLayout = (role: string, layout: WidgetPosition[]) => {
    const newLayouts = { ...layouts, [role]: layout };
    setLayouts(newLayouts);
    localStorage.setItem(layoutStorageKey, JSON.stringify(newLayouts));
  };

  const getLayout = (role: string): WidgetPosition[] => {
    return layouts[role] || [];
  };

  return {
    layouts,
    saveLayout,
    getLayout,
  };
}
