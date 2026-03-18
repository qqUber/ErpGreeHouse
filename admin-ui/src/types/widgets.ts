import { Role } from './roles';

export interface Widget {
  id: string;
  name: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  compactable: boolean;
  roles: Role[];
}

export interface WidgetProps {
  widgetId?: string;
  onExpand?: () => void;
  onCollapse?: () => void;
  isExpanded?: boolean;
  gridProps?: any;
  compactable?: boolean;
  data?: any;
  expandedContent?: React.ReactNode;
  compactContent?: React.ReactNode;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetPosition[];
  role: Role;
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetData {
  [widgetId: string]: any;
}

export interface WidgetConfig {
  [widgetId: string]: {
    compact: boolean;
    expanded: boolean;
    refreshInterval: number;
  };
}
