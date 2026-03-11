import { useEffect, useState } from 'react';
import { DashboardLayout, WidgetPosition } from '../types/widgets';

export function useWidgetLayout() {
  const [layouts, setLayouts] = useState<Record<string, WidgetPosition[]>>({});

  useEffect(() => {
    // Load saved layouts from localStorage
    const savedLayouts = localStorage.getItem('dashboardLayouts');
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts));
    }
  }, []);

  const saveLayout = (role: string, layout: WidgetPosition[]) => {
    const newLayouts = { ...layouts, [role]: layout };
    setLayouts(newLayouts);
    localStorage.setItem('dashboardLayouts', JSON.stringify(newLayouts));
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
