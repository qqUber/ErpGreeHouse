import React, { useState } from 'react';
import { Dashboard } from '../../api';

interface AdminDashboardProps {
  dash: Dashboard | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function AdminDashboard({ dash, onNavigate }: AdminDashboardProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  return (
    <div className="space-y-6" data-testid="admin_dashboard_en">
      {/* System Status Overview */}
      <div className="card cardFull" data-testid="admin_widget_system_overview_en">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-lg">Обзор системы</div>
          <div className="flex gap-2">
            <span className="pill pillGood">API: Ok</span>
            <span className="pill pillGood">Database: Ok</span>
            <span className="pill pillGood">Workers: Ok</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{dash?.customers_total || 0}</div>
            <div className="text-muted">Всего клиентов</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{dash?.sales_count || 0}</div>
            <div className="text-muted">Продаж за день</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{formatCurrency(dash?.sales_total || 0)}</div>
            <div className="text-muted">Выручка за день</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{ (dash?.bonus_earned || 0) - (dash?.bonus_used || 0) }</div>
            <div className="text-muted">Чистый баланс</div>
          </div>
        </div>
      </div>

      {/* System Health Section */}
      <div className="card cardFull" data-testid="admin_widget_system_health_en">
        <div 
          className="flex items-center justify-between cursor-pointer p-4"
          onClick={() => toggleSection('health')}
        >
          <div className="font-bold text-lg flex items-center gap-2">
            <span>🏥</span>
            System Health
          </div>
          <div className="text-muted">{collapsedSections['health'] ? '▶' : '▼'}</div>
        </div>

        {!collapsedSections['health'] && (
          <div className="p-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-semibold mb-2">Database</div>
                <div className="text-muted text-sm">Connected • 12ms latency</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-semibold mb-2">Redis</div>
                <div className="text-muted text-sm">Connected • 2ms latency</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-semibold mb-2">Workers</div>
                <div className="text-muted text-sm">2 active • 0 failed</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security & Access Section */}
      <div className="card cardFull" data-testid="admin_widget_security_en">
        <div 
          className="flex items-center justify-between cursor-pointer p-4"
          onClick={() => toggleSection('security')}
        >
          <div className="font-bold text-lg flex items-center gap-2">
            <span>🔒</span>
            Security & Access
          </div>
          <div className="text-muted">{collapsedSections['security'] ? '▶' : '▼'}</div>
        </div>

        {!collapsedSections['security'] && (
          <div className="p-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="font-semibold mb-2">Active Sessions</div>
                <div className="text-muted text-sm">3 users logged in</div>
                <div className="mt-2">
                  <button 
                    className="btn btnPrimary"
                    onClick={() => onNavigate('settings')}
                  >
                    Manage Users
                  </button>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2">System Status</div>
                <div className="text-muted text-sm">All systems operational</div>
                <div className="mt-2">
                  <button className="btn">
                    System Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics Section */}
      <div className="card cardFull" data-testid="admin_widget_performance_en">
        <div 
          className="flex items-center justify-between cursor-pointer p-4"
          onClick={() => toggleSection('performance')}
        >
          <div className="font-bold text-lg flex items-center gap-2">
            <span>⚡</span>
            Performance
          </div>
          <div className="text-muted">{collapsedSections['performance'] ? '▶' : '▼'}</div>
        </div>

        {!collapsedSections['performance'] && (
          <div className="p-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">125ms</div>
                <div className="text-muted text-sm">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">98.5%</div>
                <div className="text-muted text-sm">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">24</div>
                <div className="text-muted text-sm">Active Connections</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="card cardFull" data-testid="admin_widget_recent_activity_en">
        <div 
          className="flex items-center justify-between cursor-pointer p-4"
          onClick={() => toggleSection('activity')}
        >
          <div className="font-bold text-lg flex items-center gap-2">
            <span>📊</span>
            Recent Activity
          </div>
          <div className="text-muted">{collapsedSections['activity'] ? '▶' : '▼'}</div>
        </div>

        {!collapsedSections['activity'] && dash?.recent_activity && (
          <div className="p-4 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="font-semibold mb-4">Last Transactions</div>
                <div className="space-y-3">
                  {dash.recent_activity.transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold">#</span>
                        </div>
                        <div>
                          <div className="font-medium">{tx.customer_name}</div>
                          <div className="text-muted text-sm">{tx.product_names}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(tx.total_amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold mb-4">System Events</div>
                <div className="space-y-3">
                  {[1, 2, 3].map((event) => (
                    <div key={event} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold">✓</span>
                        </div>
                        <div>
                          <div className="font-medium">Event {event}</div>
                          <div className="text-muted text-sm">Completed successfully</div>
                        </div>
                      </div>
                      <div className="text-muted text-sm">{new Date().toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card cardFull" data-testid="admin_widget_quick_actions_en">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-lg">Quick Actions</div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            className="btn btnPrimary"
            onClick={() => onNavigate('settings')}
            data-testid="admin_btn_settings_en"
          >
            ⚙️ Settings
          </button>
          <button 
            className="btn"
            onClick={() => onNavigate('analytics')}
            data-testid="admin_btn_analytics_en"
          >
            📈 Analytics
          </button>
          <button 
            className="btn"
            onClick={() => onNavigate('customers')}
            data-testid="admin_btn_customers_en"
          >
            👥 Customers
          </button>
          <button 
            className="btn"
            onClick={() => onNavigate('products')}
            data-testid="admin_btn_products_en"
          >
            📦 Products
          </button>
        </div>
      </div>
    </div>
  );
}
