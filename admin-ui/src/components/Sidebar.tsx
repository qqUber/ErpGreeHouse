import React from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', testId: 'admin_nav_dashboard' },
    { id: 'customers', label: 'Customers', testId: 'admin_nav_customers' },
    { id: 'products', label: 'Products', testId: 'admin_nav_products' },
    { id: 'integrations', label: 'Integrations', testId: 'admin_nav_integrations' },
    { id: 'compliance', label: 'Compliance', testId: 'admin_nav_compliance' },
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
