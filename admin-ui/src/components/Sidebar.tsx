import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t } = useTranslation();
  const tabs = [
    { id: 'dashboard', label: t('menu.dashboard'), testId: 'admin_nav_dashboard' },
    { id: 'customers', label: t('menu.clients'), testId: 'admin_nav_customers' },
    { id: 'products', label: t('menu.products'), testId: 'admin_nav_products' },
    { id: 'integrations', label: t('menu.integrations'), testId: 'admin_nav_integrations' },
    { id: 'compliance', label: t('menu.compliance'), testId: 'admin_nav_compliance' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            data-testid={tab.testId}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
