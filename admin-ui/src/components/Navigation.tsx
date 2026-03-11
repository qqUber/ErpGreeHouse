import React from 'react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', testId: 'admin_nav_dashboard_en' },
    { id: 'customers', label: 'Customers', testId: 'admin_nav_customers_en' },
    { id: 'products', label: 'Products', testId: 'admin_nav_products_en' },
    { id: 'integrations', label: 'Integrations', testId: 'admin_nav_integrations_en' },
    { id: 'compliance', label: 'Compliance', testId: 'admin_nav_compliance_en' },
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
