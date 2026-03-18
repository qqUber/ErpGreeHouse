import { useTranslation } from 'react-i18next';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'dashboard', label: t('menu.dashboard'), testId: 'admin_nav_dashboard' },
    { id: 'customers', label: t('menu.clients'), testId: 'admin_nav_customers' },
    { id: 'products', label: t('menu.products'), testId: 'admin_nav_products' },
    { id: 'integrations', label: t('menu.integrations'), testId: 'admin_nav_integrations' },
    { id: 'compliance', label: t('menu.compliance'), testId: 'admin_nav_compliance' },
  ];

  return (
    <nav className="main-navigation">
      <ul className="nav-tabs">
        {tabs.map((tab) => (
          <li key={tab.id} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
